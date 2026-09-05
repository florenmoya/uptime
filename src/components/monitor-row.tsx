'use client';
import { useState } from 'react';
import { ChevronDown,ExternalLink,Settings2,Pause,Play,RefreshCw } from 'lucide-react';
import type { MonitorView } from '@/lib/dashboard';
import { relative,statusOf,timestamp,type Action } from './format';

function History({monitor,now}:{monitor:MonitorView;now:string}){
  const end=Math.floor(new Date(now).getTime()/60000)*60000;
  const lookup=new Map(monitor.history.map(h=>[new Date(h.minute).getTime(),h.ok]));
  const values=Array.from({length:60},(_,i)=>lookup.get(end-i*60000));
  const passed=values.filter(v=>v===true).length,failed=values.filter(v=>v===false).length;
  return <div className="history" role="img" aria-label={`${monitor.name}, past hour: ${passed} minute buckets passed, ${failed} failed, ${60-passed-failed} without observations. Gray means no observation.`}>
    {Array.from({length:60},(_,i)=>{
      const minute=end-(59-i)*60000,ok=lookup.get(minute);
      return <span key={minute} className={ok===undefined?'empty':ok?'good':'bad'} title={`${timestamp(new Date(minute).toISOString())}: ${ok===undefined?'No check recorded':ok?'Check passed':'Check failed'}`}/>;
    })}
  </div>;
}
function ResponseChart({monitor}:{monitor:MonitorView}){
  const samples=monitor.recent,max=Math.max(100,...samples.map(s=>s.latency_ms));
  if(!samples.length)return <div className="chart-empty">Response times will appear after the first check.</div>;
  const points=samples.map((s,i)=>`${samples.length===1?270:10+i/(samples.length-1)*520},${100-s.latency_ms/max*80}`).join(' ');
  return <div className="response-chart"><div className="chart-scale"><span>{max.toLocaleString()} ms</span><span>0 ms</span></div><svg viewBox="0 0 540 115" role="img" aria-label={`Response time across ${samples.length} recent checks. Latest ${samples.at(-1)?.latency_ms} milliseconds.`}>
    <path d="M0 20H540 M0 60H540 M0 100H540" className="chart-grid"/>
    <polyline points={points} fill="none" className="chart-line"/>
    {samples.map((s,i)=><circle key={s.checked_at} cx={samples.length===1?270:10+i/(samples.length-1)*520} cy={100-s.latency_ms/max*80} r="3" className={s.ok?'chart-point':'chart-failed'}><title>{timestamp(s.checked_at)} · {s.latency_ms} ms · {s.ok?'Passed':s.error}</title></circle>)}
  </svg></div>;
}
export default function MonitorRow({monitor:m,now,action,busy}:{monitor:MonitorView;now:string;action:Action;busy:boolean}){
  const [expanded,setExpanded]=useState(false),[editing,setEditing]=useState(false);
  const state=statusOf(m,now);
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const values=new FormData(event.currentTarget);
    if(await action({action:'update',id:m.id,name:values.get('name'),project:values.get('project'),url:values.get('url'),enabled:values.get('enabled')==='on'}))setEditing(false);
  }
  return <article className={`monitor-row ${expanded?'is-expanded':''}`}>
    <div className="monitor-grid">
      <button className="monitor-identity" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded} aria-controls={`details-${m.id}`}>
        <span className={`status-dot ${state.key}`}/><span className="monitor-copy"><strong>{m.name}</strong><span><span className="project-name">{m.project}</span><span className={`status-label ${state.key}`}>{state.label}</span></span></span>
      </button>
      <div className="monitor-history"><History monitor={m} now={now}/><div className="history-labels"><span>60 minutes ago</span><span>Now</span></div></div>
      <div className="monitor-stat"><span className="mobile-label">Response</span><strong>{m.last_latency_ms!==null?<>{m.last_latency_ms.toLocaleString()} <small>ms</small></>:'—'}</strong><span><span className="sr-only">Last checked: </span>{relative(m.last_checked_at,now)}</span></div>
      <div className="monitor-stat ratio"><span className="mobile-label">Checks passed · 24h</span><strong>{m.total?`${(m.passed/m.total*100).toFixed(2)}%`:'—'}</strong><span>{m.total?`${m.coverage}% coverage`:'No observations'}</span></div>
      <button className={`icon-button expand ${expanded?'expanded':''}`} onClick={()=>setExpanded(!expanded)} aria-label={`${expanded?'Collapse':'Expand'} ${m.name}`} aria-expanded={expanded}><ChevronDown size={18}/></button>
    </div>
    {expanded&&<div className="monitor-detail" id={`details-${m.id}`}>
      <div className="detail-toolbar"><div className="target-url">{m.url?<a href={m.url} target="_blank" rel="noreferrer">{m.url}<ExternalLink size={13}/></a>:<span>Add the exact target URL to start checking this monitor.</span>}</div><div className="button-group">
        <button className="small-button" onClick={()=>setEditing(!editing)} aria-expanded={editing}><Settings2 size={14}/>{editing?'Close editor':'Edit monitor'}</button>
        <button className="small-button" disabled={busy||!m.url} onClick={()=>action({action:'update',id:m.id,name:m.name,project:m.project,url:m.url,enabled:!m.enabled})}>{m.enabled?<Pause size={14}/>:<Play size={14}/>} {m.enabled?'Pause':'Resume'}</button>
        <button className="small-button" disabled={busy||!m.enabled||!m.url} onClick={()=>action({action:'check',id:m.id})}><RefreshCw size={14}/>Check now</button>
      </div></div>
      {editing&&<form className="monitor-form" onSubmit={save} key={`${m.id}-${m.url}-${m.enabled}`}>
        <label>Monitor name<input name="name" defaultValue={m.name} maxLength={120} required/></label>
        <label>Project<input name="project" defaultValue={m.project} maxLength={60} required/></label>
        <label className="url-field">Target URL<input name="url" type="url" defaultValue={m.url??''} placeholder="https://your-service.example/health" maxLength={2000}/></label>
        <label className="checkbox-label"><input type="checkbox" name="enabled" defaultChecked={m.enabled}/>Enable monitoring</label>
        <div className="form-actions"><button type="button" className="small-button" onClick={()=>setEditing(false)}>Cancel</button><button className="primary-button" disabled={busy}>Save monitor</button></div>
        <p className="form-hint">Changing the target or pausing ends an open incident as a configuration change. A blank URL leaves the monitor unconfigured.</p>
      </form>}
      <div className="detail-columns"><section><h3>Response time <span>Last {m.recent.length} checks</span></h3><ResponseChart monitor={m}/></section><section className="check-facts"><h3>Latest observation</h3><dl><div><dt>HTTP status</dt><dd>{m.last_http_status??'—'}</dd></div><div><dt>Frequency</dt><dd>Every {m.interval_seconds} seconds</dd></div><div><dt>Checks passed · 24h</dt><dd>{m.total?`${m.passed} of ${m.total}`:'No checks yet'}</dd></div><div><dt>Checked at</dt><dd>{m.last_checked_at?timestamp(m.last_checked_at):'—'}</dd></div></dl>{m.last_error&&<p className="check-error">{m.last_error}</p>}</section></div>
    </div>}
  </article>;
}
