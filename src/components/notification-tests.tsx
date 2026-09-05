'use client';
import {useState} from 'react';
import {Send} from 'lucide-react';
import type {DashboardData} from '@/lib/dashboard';
import {buildTestNotifications,notificationFields,TEST_SCENARIOS,type TestScenario} from '@/lib/notification-content';
import type {Action} from './format';

export default function NotificationTests({data,action,busy}:{data:DashboardData;action:Action;busy:boolean}){
  const monitors=data.monitors.filter(m=>m.url);
  const [monitorId,setMonitorId]=useState(monitors[0]?.id??'');
  const [scenario,setScenario]=useState<TestScenario|'all'>('http');
  const monitor=monitors.find(m=>m.id===monitorId);
  const samples=monitor?buildTestNotifications({...monitor,url:monitor.url!},scenario,data.now,''):[];
  const count=scenario==='all'?TEST_SCENARIOS.length:1;
  return <div className="notification-tests"><h3>Test notifications</h3>
    <div className="notification-test-fields"><label>Monitor<select value={monitorId} disabled={busy} onChange={e=>setMonitorId(e.target.value)}>{!monitors.length&&<option value="">No configured monitors</option>}{monitors.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Scenario<select value={scenario} disabled={busy} onChange={e=>setScenario(e.target.value as TestScenario|'all')}>{TEST_SCENARIOS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}<option value="all">All {TEST_SCENARIOS.length} scenarios</option></select></label></div>
    <p className="notification-test-note">Uses real alert templates with sample results. Tests do not change service status.</p>
    <div className="notification-test-actions">{(['discord','email'] as const).map(channel=><button key={channel} className="small-button" disabled={busy||!monitor||!data.config[channel]} onClick={()=>action({action:'test',channel,monitorId,scenario})}><Send size={14}/>{`Send ${count>1?`${count} `:''}${channel==='discord'?'Discord':'email'} test${count>1?'s':''}`}</button>)}</div>
    {samples.length>0&&<details className="notification-preview"><summary>Preview {samples.length>1?`${samples.length} messages`:'message'}</summary>{samples.map((sample,index)=><article className={`notification-sample ${sample.kind}`} key={index}><h4>{sample.title}</h4><p>{sample.message}</p><dl>{notificationFields(sample).map(field=><div key={field.name}><dt>{field.name}</dt><dd>{field.value}</dd></div>)}</dl></article>)}</details>}
  </div>;
}
