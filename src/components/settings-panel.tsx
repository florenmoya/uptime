'use client';
import { Bell,Mail,MessageSquare,Send,Clock3,CheckCircle2 } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard';
import { timestamp,type Action } from './format';
import PublicPages from './public-pages';

export function DeliveryHistory({data}:{data:DashboardData}){
  return <section className="section-block"><h2>Delivery history</h2><p className="section-description">Sent means the provider accepted the message.</p>
    {data.deliveries.length?<div className="delivery-list">{data.deliveries.map(d=><div className="delivery-row" key={d.id}><div className="delivery-channel">{d.channel==='discord'?<MessageSquare size={17}/>:<Mail size={17}/>}<span>{d.channel==='discord'?'Discord':'Email'}</span></div><div className="delivery-subject"><strong>{d.payload.title}</strong><span>{d.last_error??`${d.attempts} attempt${d.attempts===1?'':'s'} · ${timestamp(d.created_at)}`}</span></div><span className={`delivery-status ${d.status}`}>{d.status==='sent'?'Sent':d.status==='pending'?'Queued':d.status==='failed'?'Failed':'Canceled'}</span></div>)}</div>:<div className="empty-state compact"><Send size={24}/><div><h3>No notifications sent yet</h3><p>Send a test to verify your connection. Incident alerts appear here too.</p></div></div>}
  </section>;
}
export default function SettingsPanel({data,action,busy}:{data:DashboardData;action:Action;busy:boolean}){
  return <div className="settings-content"><section className="section-block"><h2>Notifications</h2><p className="section-description">Receive one alert when an outage is confirmed, and one when the site recovers.</p>
    <div className="alert-switch"><div><Bell size={20}/><div><h3>Automatic incident alerts</h3><p>{data.config.alertsEnabled?'Enabled for future outage and recovery events.':'Paused. Test messages can still be sent.'}</p></div></div><button role="switch" aria-checked={data.config.alertsEnabled} aria-label="Automatic incident alerts" className={`switch ${data.config.alertsEnabled?'on':''}`} disabled={busy} onClick={()=>action({action:'alerts',enabled:!data.config.alertsEnabled})}><span/></button></div>
    <div className="channel-row"><MessageSquare size={22}/><div><h3>Discord <span className={`connection-label ${data.config.discord?'connected':''}`}>{data.config.discord?'Configured':'Not configured'}</span></h3>{!data.config.discord&&<p>Set DISCORD_WEBHOOK_URL in .env.local.</p>}</div><button className="small-button" disabled={busy||!data.config.discord} onClick={()=>action({action:'test',channel:'discord'})}><Send size={14}/>Send Discord test</button></div>
    <div className="channel-row"><Mail size={22}/><div><h3>Email <span className={`connection-label ${data.config.email?'connected':''}`}>{data.config.email?'Configured':'Setup needed'}</span></h3><p>{data.config.email?`${data.config.mailRecipients} recipient${data.config.mailRecipients===1?'':'s'} configured through SMTP.`:'Add an SMTP server, sender, and recipient in .env.local.'}</p></div><button className="small-button" disabled={busy||!data.config.email} onClick={()=>action({action:'test',channel:'email'})}><Send size={14}/>Send email test</button></div>
    {!data.config.email&&<details className="email-guide"><summary>Email setup instructions</summary><p>Use your mail provider’s SMTP credentials. Fill these fields in the project’s <code>.env.local</code>, then restart the web app and worker.</p><pre>{'SMTP_HOST=smtp.your-provider.com\nSMTP_PORT=587\nSMTP_SECURE=false\nSMTP_USER=your-smtp-user\nSMTP_PASSWORD=your-smtp-password\nMAIL_FROM=Uptime <alerts@your-domain.com>\nMAIL_TO=you@your-domain.com'}</pre><p>Separate multiple recipients with commas. Port 465 uses <code>SMTP_SECURE=true</code>. Credentials never appear in the dashboard.</p></details>}
  </section>
  <PublicPages data={data} action={action} busy={busy}/>
  <DeliveryHistory data={data}/>
  <section className="section-block"><h2>Monitoring setup</h2><div className="setup-facts"><div><Clock3 size={19}/><span>Checks<strong>Every 60 seconds · 10-second timeout</strong></span></div><div><CheckCircle2 size={19}/><span>Confirmation<strong>Two failed checks down · two healthy checks recovered</strong></span></div></div></section>
  </div>;
}
