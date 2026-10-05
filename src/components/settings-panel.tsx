'use client';
import { Bell,Mail,MessageSquare,Send,Clock3,CheckCircle2 } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard';
import { timestamp,type Action } from './format';
import PublicPages from './public-pages';
import NotificationTests from './notification-tests';
import NotificationConnections from './notification-connections';
import OverviewSettings from './overview-settings';
import MonitorOrder from './monitor-order';

export function DeliveryHistory({data}:{data:DashboardData}){
  return <section className="section-block"><h2>Delivery history</h2><p className="section-description">Sent means the provider accepted the message.</p>
    {data.deliveries.length?<div className="delivery-list">{data.deliveries.map(d=><div className="delivery-row" key={d.id}><div className="delivery-channel">{d.channel==='discord'?<MessageSquare size={17}/>:<Mail size={17}/>}<span>{d.channel==='discord'?'Discord':'Email'}</span></div><div className="delivery-subject"><strong>{d.payload.title}</strong><span>{d.last_error??`${d.attempts} attempt${d.attempts===1?'':'s'} · ${timestamp(d.created_at)}`}</span></div><span className={`delivery-status ${d.status}`}>{d.status==='sent'?'Sent':d.status==='pending'?'Queued':d.status==='failed'?'Failed':'Canceled'}</span></div>)}</div>:<div className="empty-state compact"><Send size={24}/><div><h3>No notifications sent yet</h3><p>Send a test to verify your connection. Incident alerts appear here too.</p></div></div>}
  </section>;
}
export default function SettingsPanel({data,action,busy}:{data:DashboardData;action:Action;busy:boolean}){
  return <div className="settings-content"><section className="section-block"><h2>Incident notifications</h2><p className="section-description">Outage and recovery alerts.</p>
    <div className="alert-switch"><div><Bell size={20}/><div><h3>All incident alerts</h3><p>{data.config.alertsEnabled?'Discord and email.':'Paused. Test messages can still be sent.'}</p></div></div><button role="switch" aria-checked={data.config.alertsEnabled} aria-label="All incident alerts" className={`switch ${data.config.alertsEnabled?'on':''}`} disabled={busy} onClick={()=>action({action:'alerts',enabled:!data.config.alertsEnabled})}><span/></button></div>
    <NotificationConnections settings={data.config.notifications} action={action} busy={busy}/>
    <section className="monitor-email-settings" aria-labelledby="monitor-email-heading">
      <h3 id="monitor-email-heading">Email alerts by monitor</h3>
      <p className="section-description">Choose which services send outage and recovery emails.</p>
      {!data.config.alertsEnabled?<p className="notification-test-note">All incident alerts are paused. Your email selections are saved.</p>:!data.config.email?<p className="notification-test-note">Enable and configure Email above to receive alerts for your selected monitors.</p>:null}
      {data.monitors.length?<ul className="monitor-email-list">
        {data.monitors.map(m=><li key={m.id}>
          <span className="monitor-email-name">{m.name}</span>
          <span className="monitor-email-state" aria-hidden="true">{m.email_alerts_enabled?'On':'Off'}</span>
          <button type="button" role="switch" aria-checked={m.email_alerts_enabled} aria-label={`Email alerts for ${m.name}`} className={`switch ${m.email_alerts_enabled?'on':''}`} disabled={busy} onClick={()=>void action({action:'monitors.email-alerts',id:m.id,enabled:!m.email_alerts_enabled})}><span/></button>
        </li>)}
      </ul>:<p className="section-description">Add a monitor to choose its email alerts.</p>}
    </section>
    <NotificationTests data={data} action={action} busy={busy}/>
  </section>
  <OverviewSettings data={data} action={action} busy={busy}/>
  <MonitorOrder monitors={data.monitors} action={action} busy={busy}/>
  <PublicPages data={data} action={action} busy={busy}/>
  <DeliveryHistory data={data}/>
  <section className="section-block"><h2>Monitoring setup</h2><div className="setup-facts"><div><Clock3 size={19}/><span>Checks<strong>Every 60 seconds · 10-second timeout</strong></span></div><div><CheckCircle2 size={19}/><span>Confirmation<strong>Two failed checks down · two healthy checks recovered</strong></span></div></div></section>
  </div>;
}
