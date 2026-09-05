'use client';
import {useState} from 'react';
import {Mail,MessageSquare} from 'lucide-react';
import type {NotificationSettingsView} from '@/lib/notification-settings';
import type {Action} from './format';

function ConnectionForm({channel,settings,action,busy,close}:{channel:'discord'|'email';settings:NotificationSettingsView;action:Action;busy:boolean;close:()=>void}){
  const initial=settings[channel];
  const [enabled,setEnabled]=useState(initial.enabled);
  const [webhook,setWebhook]=useState('');
  const [email,setEmail]=useState({...settings.email,password:'',to:settings.email.to.join(', ')});
  const update=(key:string,value:string)=>setEmail(previous=>({...previous,[key]:value}));
  async function save(event:React.FormEvent){
    event.preventDefault();
    const fields=channel==='discord'?{webhook}:{host:email.host,port:Number(email.port),user:email.user,password:email.password,from:email.from,to:email.to};
    if(await action({action:'notifications.save',channel,enabled,...fields}))close();
  }
  return <form className="connection-form" onSubmit={save} aria-label={`${channel==='discord'?'Discord':'Email'} settings`}>
    <fieldset disabled={busy}><legend className="sr-only">{channel==='discord'?'Discord':'Email'} connection</legend>
      <label className="connection-enabled"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Enable {channel==='discord'?'Discord':'email'} notifications</label>
      {channel==='discord'?<label className="connection-field">Webhook URL<input type="password" autoComplete="new-password" spellCheck={false} value={webhook} onChange={e=>setWebhook(e.target.value)} required={enabled&&!settings.discord.hasWebhook} maxLength={500} placeholder={settings.discord.hasWebhook?'Saved webhook — leave blank to keep':'Paste Discord webhook URL'}/></label>:<div className="connection-grid">
        <label>SMTP host<input value={email.host} onChange={e=>update('host',e.target.value)} required={enabled} maxLength={253} placeholder="smtp.gmail.com" autoComplete="off"/></label>
        <label>Port<select value={email.port} onChange={e=>update('port',e.target.value)}><option value={587}>587 · STARTTLS</option><option value={465}>465 · TLS</option><option value={2525}>2525 · STARTTLS</option><option value={25}>25 · STARTTLS</option></select></label>
        <label>Username<input value={email.user} onChange={e=>update('user',e.target.value)} maxLength={254} autoComplete="off"/></label>
        <label>Password<input type="password" value={email.password} onChange={e=>update('password',e.target.value)} maxLength={1024} autoComplete="new-password" placeholder={settings.email.hasPassword?'Saved password — leave blank to keep':'SMTP password'}/></label>
        <label>Sender<input value={email.from} onChange={e=>update('from',e.target.value)} required={enabled} maxLength={320} placeholder="alerts@example.com"/></label>
        <label>Recipients<input value={email.to} onChange={e=>update('to',e.target.value)} required={enabled} maxLength={2000} placeholder="you@example.com"/><small>Separate addresses with commas.</small></label>
      </div>}
      <div className="connection-actions"><button type="submit" className="primary-button">{busy?'Saving…':'Save changes'}</button><button type="button" className="small-button" onClick={close}>Cancel</button></div>
    </fieldset>
  </form>;
}
export default function NotificationConnections({settings,action,busy}:{settings:NotificationSettingsView;action:Action;busy:boolean}){
  const [editing,setEditing]=useState<'discord'|'email'|null>(null);
  return <div className="notification-connections">{(['discord','email'] as const).map(channel=>{
    const configured=channel==='discord'?settings.discord.hasWebhook:Boolean(settings.email.host&&settings.email.from&&settings.email.to.length);
    const enabled=settings[channel].enabled;
    const name=channel==='discord'?'Discord':'Email';
    return <div key={channel}><div className="channel-row">{channel==='discord'?<MessageSquare size={22}/>:<Mail size={22}/>}<div><h3>{name} <span className={`connection-label ${configured&&enabled?'connected':''}`}>{!configured?'Not configured':enabled?'Configured':'Disabled'}</span></h3>{channel==='email'&&configured&&<p>{settings.email.to.join(', ')}</p>}</div><button type="button" className="small-button" disabled={busy} aria-expanded={editing===channel} onClick={()=>setEditing(editing===channel?null:channel)}>{editing===channel?'Close':`Edit ${name}`}</button></div>{editing===channel&&<ConnectionForm key={channel} channel={channel} settings={settings} action={action} busy={busy} close={()=>setEditing(null)}/>}</div>;
  })}</div>;
}
