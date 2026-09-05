'use client';
import { useCallback,useEffect,useState } from 'react';
import { Activity,ArrowUpRight,Check,CheckCircle2,CircleHelp,Clock3,RefreshCw,Search,Settings2,TriangleAlert,X } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard';
import MonitorRow from './monitor-row';
import SettingsPanel from './settings-panel';
import LogoutButton from './logout-button';
import { relative,statusOf,timestamp } from './format';

export default function Dashboard({initial}:{initial:DashboardData}){
  const [snapshot,setData]=useState(initial),[now,setNow]=useState(initial.now),[tab,setTab]=useState<'monitors'|'incidents'|'settings'>('monitors');
  const data={...snapshot,now};
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null),[connectionError,setConnectionError]=useState(false);
  const refresh=useCallback(async()=>{
    try{const response=await fetch('/api/dashboard',{cache:'no-store'});if(response.status===401){window.location.assign('/login');return;}if(!response.ok)throw new Error();setData(await response.json());setConnectionError(false);}catch{setConnectionError(true);}
  },[]);
  useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)void refresh();},10000);const visible=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[refresh]);
  useEffect(()=>{const tick=()=>setNow(new Date().toISOString());const timer=setInterval(tick,5000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[]);
  async function action(input:Record<string,unknown>){
    setBusy(true);setNotice(null);
    try{const response=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});if(response.status===401){window.location.assign('/login');return false;}const result=await response.json();if(!response.ok)throw new Error(result.error??'The action failed.');setNotice({text:result.message,error:false});await refresh();return true;}
    catch(error){setNotice({text:error instanceof Error?error.message:'Connection failed. Please try again.',error:true});return false;}
    finally{setBusy(false);}
  }
  const states=data.monitors.map(m=>statusOf(m,data.now));
  const healthy=states.filter(s=>s.key==='up').length,down=states.filter(s=>s.key==='down').length,needsSetup=states.filter(s=>s.key==='setup').length;
  const uncertain=states.filter(s=>['unknown','checking'].includes(s.key)).length;
  const active=data.incidents.filter(i=>!i.resolved_at);
  const workerAlive=data.worker&&new Date(data.now).getTime()-new Date(data.worker.heartbeat_at).getTime()<90000;
  const visible=data.monitors.filter(m=>`${m.name} ${m.project} ${m.url??''}`.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||statusOf(m,data.now).key===filter));
  const headline=down?`${down} service${down===1?' needs':'s need'} attention`:uncertain?'Waiting for fresh observations':healthy===data.monitors.length?'All services are operational':`${healthy} service${healthy===1?' is':'s are'} operational`;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to monitors</a>
    <header className="app-header"><div className="header-inner"><a href="/" className="brand"><span className="brand-symbol"><Activity size={23}/></span><span>bayanko<span className="brand-product">uptime</span></span></a><div className="header-meta"><span className={`worker-indicator ${workerAlive?'online':'offline'}`}><span/>{workerAlive?'Checker running':'Checker offline'}</span><LogoutButton/></div></div></header>
    <div className="page-container"><nav className="main-nav" aria-label="Main navigation">{(['monitors','incidents','settings'] as const).map(item=><button key={item} className={tab===item?'active':''} onClick={()=>setTab(item)} aria-current={tab===item?'page':undefined}>{item==='monitors'?'Overview':item==='incidents'?'Incidents':'Settings'}{item==='incidents'&&active.length>0&&<span className="nav-count">{active.length}</span>}</button>)}</nav>
    <main id="main-content">
      <div className="page-heading"><div><h1>{tab==='monitors'?'Service overview':tab==='incidents'?'Incident history':'Settings'}</h1></div>{tab==='monitors'&&<button className="primary-button" disabled={busy||!workerAlive} onClick={()=>action({action:'check'})}><RefreshCw size={16} className={busy?'spinning':''}/>Run checks</button>}</div>
      {connectionError&&<div className="notice error" role="alert"><TriangleAlert size={18}/><span>Live refresh failed. These observations may be out of date.</span><button onClick={()=>void refresh()}>Retry</button></div>}
      {!workerAlive&&<div className="notice warning" role="status"><Clock3 size={18}/><span>The background checker is not running. Start it with <code>npm run worker</code> to collect new observations.</span></div>}
      {notice&&<div className={`notice ${notice.error?'error':'success'}`} role={notice.error?'alert':'status'}>{notice.error?<TriangleAlert size={18}/>:<Check size={18}/>}<span>{notice.text}</span><button className="icon-button" onClick={()=>setNotice(null)} aria-label="Dismiss message"><X size={16}/></button></div>}
      {tab==='monitors'&&<>
        <section className={`health-summary ${down?'has-outage':uncertain?'has-unknown':''}`} aria-label="Overall health"><div className="health-message">{down?<TriangleAlert size={29}/>:uncertain?<Clock3 size={29}/>:<CheckCircle2 size={29}/>}<div><h2>{headline}</h2>{needsSetup>0&&<p>{needsSetup} monitors need a target URL.</p>}</div></div><div className="health-totals"><span><b>{healthy}</b> Healthy</span><span><b>{down}</b> Down</span><span><b>{data.monitors.length}</b> Total</span></div></section>
        {needsSetup>0&&<div className="setup-note"><CircleHelp size={16}/><p>The imported status page hides its target URLs. <strong>{data.monitors.filter(m=>!m.url).map(m=>m.name).join(' and ')}</strong> {needsSetup===1?'needs its address':'need their addresses'}. Verify the starting URLs in each monitor’s editor.</p><button onClick={()=>setFilter(filter==='setup'?'all':'setup')}>{filter==='setup'?'Show all':'Finish setup'}<ArrowUpRight size={15}/></button></div>}
        <section className="monitor-section" aria-label="Monitors"><div className="table-toolbar"><div className="filter-buttons" aria-label="Filter monitors">{[['all','All monitors'],['up','Healthy'],['down','Down'],['setup','Needs setup']].map(([value,label])=><button key={value} className={filter===value?'selected':''} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}{value==='all'&&<span>{data.monitors.length}</span>}</button>)}</div><label className="search-field"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find a monitor…" aria-label="Find a monitor"/></label></div>
        <div className="table-head monitor-grid" aria-hidden="true"><span>Monitor</span><span>Checks · past hour</span><span>Response</span><span>Passed · 24h</span><span/></div>
        {visible.length?visible.map(m=><MonitorRow key={m.id} monitor={m} now={data.now} action={action} busy={busy}/>):<div className="empty-state"><Search size={26}/><div><h3>No matching monitors</h3><p>Try another name or change the status filter.</p><button className="small-button" onClick={()=>{setSearch('');setFilter('all');}}>Clear filters</button></div></div>}
        <div className="table-footer"><span><span className="legend-dot good"/> Passed<span className="legend-dot bad"/> Failed<span className="legend-dot empty"/> No observation</span><span>Updated {relative(snapshot.now,now)} · refreshes every 10s</span></div></section>
        <div className="overview-bottom"><div><h2>Recent incidents</h2>{data.incidents.length?<div className="recent-incidents">{data.incidents.slice(0,3).map(i=><button key={i.id} onClick={()=>setTab('incidents')}><span className={`status-dot ${i.resolved_at?'up':'down'}`}/><span><strong>{i.name}</strong><span>{i.reason} · {timestamp(i.started_at)}</span></span><span>{i.resolved_at?'Resolved':'Open'}</span></button>)}</div>:<div className="quiet-state"><CheckCircle2 size={21}/><div><h3>No incidents recorded</h3><p>A single failed check is verified before an incident is opened.</p></div></div>}</div><div className="notification-overview"><h2>Alert connections</h2><div><span>Discord</span><span className={data.config.discord?'text-good':'text-muted'}>{data.config.discord?'Configured':'Not configured'}</span></div><div><span>Email</span><span className={data.config.email?'text-good':'text-muted'}>{data.config.email?'Configured':'Setup needed'}</span></div><button onClick={()=>setTab('settings')}><Settings2 size={14}/>{data.config.alertsEnabled?'Manage notifications':'Automatic alerts paused · configure'}<ArrowUpRight size={14}/></button></div></div>
      </>}
      {tab==='incidents'&&<section className="incident-section">{data.incidents.length?data.incidents.map(i=><article className="incident-entry" key={i.id}><div className="incident-icon">{i.resolved_at?<CheckCircle2 size={22}/>:<TriangleAlert size={22}/>}</div><div><div className="incident-title"><h2>{i.name}</h2><span className={`delivery-status ${i.resolved_at?'sent':'failed'}`}>{i.resolved_at?'Closed':'Open'}</span></div><p>{i.reason}</p><div className="incident-times"><span>Opened {timestamp(i.started_at)}</span>{i.resolved_at&&<span>Closed {timestamp(i.resolved_at)}</span>}<span>Incident #{i.id}</span></div>{i.resolution&&<p className="resolution">{i.resolution}</p>}</div></article>):<div className="empty-state"><CheckCircle2 size={30}/><div><h2>No incidents recorded</h2><p>Confirmed outages will appear here with their cause and recovery time.</p></div></div>}</section>}
      {tab==='settings'&&<SettingsPanel data={data} action={action} busy={busy}/>}
    </main><footer className="page-footer"><span>Times in Philippine Standard Time</span></footer>
    </div>
  </div>;
}
