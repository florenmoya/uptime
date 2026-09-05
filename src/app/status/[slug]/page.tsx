import {notFound} from 'next/navigation';
import {CheckCircle2,Clock3,TriangleAlert} from 'lucide-react';
import {getPublicPage} from '@/lib/public-status';
import PublicAutoRefresh from '@/components/public-auto-refresh';
import PublicHistory from '@/components/public-history';
export const dynamic='force-dynamic';
export const metadata={title:'Service status',description:'Current service availability and incident history.'};
const labels={up:'Operational',down:'Disrupted',unknown:'Unknown',paused:'Paused'};
const date=(value:string)=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(new Date(value));
export default async function StatusPage({params}:{params:Promise<{slug:string}>}){
  const data=await getPublicPage((await params).slug);
  if(!data)notFound();
  const down=data.monitors.filter(m=>m.status==='down').length;
  const healthy=data.monitors.filter(m=>m.status==='up').length;
  const uncertain=healthy!==data.monitors.length;
  return <div className="public-status-shell">
    <header className="public-header"><div className="public-header-inner"><div className="public-identity"><h1>{data.title}</h1>{data.description&&<p>{data.description}</p>}</div><div className="public-header-meta"><h2>Service status</h2><PublicAutoRefresh updatedAt={data.updatedAt}/></div></div></header>
    <main className="public-status">
      <section className={`public-summary ${down?'disrupted':uncertain?'uncertain':''}`} aria-label="Overall status"><span className="public-summary-icon">{down?<TriangleAlert size={28}/>:uncertain?<Clock3 size={28}/>:<CheckCircle2 size={28}/>}</span><div><h2>{down?<>Some services <em>disrupted</em></>:uncertain?<>Service status <em>unconfirmed</em></>:<>All systems <em>operational</em></>}</h2><p>{down?`${down} service${down===1?' is':'s are'} experiencing an issue.`:uncertain?`${healthy} of ${data.monitors.length} services have a current healthy status.`:`All ${data.monitors.length} services are responding normally.`}</p></div><span className="public-summary-note">Checks every minute</span></section>
      <section className="public-services-section" aria-labelledby="services-heading"><div className="public-section-heading"><h2 id="services-heading">Services</h2><span>Last 30 days</span></div>
        <div className="public-services"><div className="public-table-heading" aria-hidden="true"><span>Service</span><span>Checks passed</span><span>Daily history</span><span>Current status</span></div>
          {data.monitors.map(m=><article className="public-service" key={m.id}><h3 className="public-service-name">{m.name}</h3><div className={`public-score ${!m.total?'no-data':m.passed/m.total>=.99?'high':m.passed/m.total>=.95?'medium':'low'}`}><strong>{m.total?`${(m.passed/m.total*100).toFixed(3)}%`:'—'}</strong><span className="public-score-label">Checks passed</span></div><PublicHistory days={m.days} name={m.name}/><span className={`public-current ${m.status}`}><i/>{labels[m.status]}</span></article>)}
        </div>
        <div className="public-history-key"><div className="public-legend"><span><i className="healthy"/>Healthy</span><span><i className="mixed"/>Some checks failed</span><span><i className="failed"/>Failed</span><span><i className="unobserved"/>No observations</span></div><p>Percentages use recorded checks; gaps are excluded. Daily history uses Philippine time.</p></div>
      </section>
      <section className="public-incidents"><div className="public-section-heading"><h2>Incident history</h2><span>Last 60 days</span></div>{data.incidents.length?data.incidents.map(i=><article key={i.id}><div><span className={`public-incident-marker ${i.resolvedAt?'resolved':'open'}`}>{i.resolvedAt?'Closed':'Ongoing'}</span><h3>{i.name} — Service disruption</h3></div><p>Started {date(i.startedAt)}{i.resolvedAt&&` · Closed ${date(i.resolvedAt)}`}</p></article>):<div className="public-no-incidents"><CheckCircle2 size={20}/><div><h3>No incidents recorded</h3><p>No confirmed incidents in the last 60 days.</p></div></div>}</section>

    </main>
  </div>;
}
