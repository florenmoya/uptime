'use client';
import {useState} from 'react';
import {LayoutList} from 'lucide-react';
import type {DashboardData} from '@/lib/dashboard';
import {timestamp,type Action} from './format';
import {buildOverview} from '@/lib/overview-content';

export default function OverviewSettings({data,action,busy}:{data:DashboardData;action:Action;busy:boolean}){
  const current=data.config.notifications.overview;
  const [editing,setEditing]=useState(false),[enabled,setEnabled]=useState(current.enabled),[webhook,setWebhook]=useState(''),[messageId,setMessageId]=useState('');
  const ready=current.hasWebhook||data.config.notifications.discord.hasWebhook;
  const preview=buildOverview(data.monitors,data.now,'').embeds[0];
  async function save(event:React.FormEvent){event.preventDefault();if(await action({action:'notifications.save',channel:'overview',enabled,webhook})){setWebhook('');setEditing(false);}}
  return <section className="section-block"><div className="channel-row overview-heading"><LayoutList size={22}/><div><h2>Discord overview <span className={`connection-label ${ready&&current.enabled?'connected':''}`}>{!ready?'Not configured':current.enabled?'Enabled':'Disabled'}</span></h2><p>One message, updated every minute.</p></div><div className="notification-channel-actions"><button type="button" role="switch" aria-checked={current.enabled} aria-label="Discord overview" className={`switch ${current.enabled?'on':''}`} disabled={busy||(!current.enabled&&!ready)} onClick={async()=>{if(await action({action:'notifications.save',channel:'overview',enabled:!current.enabled})){setEditing(false);setWebhook('');}}}><span/></button><button className="small-button" disabled={busy} aria-expanded={editing} onClick={()=>{setEnabled(current.enabled);setWebhook('');setEditing(!editing);}}>{editing?'Close':'Edit overview'}</button></div></div>
    {editing&&<form className="connection-form" onSubmit={save} aria-label="Overview settings"><fieldset disabled={busy}><legend className="sr-only">Overview connection</legend><label className="connection-enabled"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Enable overview</label><label className="connection-field">Overview webhook URL<input type="password" autoComplete="new-password" value={webhook} onChange={e=>setWebhook(e.target.value)} maxLength={500} required={enabled&&!ready} placeholder={ready?'Saved webhook — leave blank to keep':'Paste Discord webhook URL'}/></label><div className="connection-actions"><button className="primary-button" type="submit">Save changes</button><button className="small-button" type="button" onClick={()=>{setEditing(false);setWebhook('');}}>Cancel</button></div></fieldset></form>}
    <p className="overview-sync-status">{!current.enabled?'Disabled':!ready?'Configure a Discord webhook to start.':data.overview?.last_updated_at?`Updated ${timestamp(data.overview.last_updated_at)}`:'Waiting for the first update.'}</p>
    {data.overview?.last_error&&<p className="overview-error" role="status">{data.overview.last_error}</p>}
    {data.overview?.creation_pending&&data.overview.last_error&&<div className="connection-form"><label className="connection-field">Existing message ID<input value={messageId} onChange={e=>setMessageId(e.target.value)} inputMode="numeric" maxLength={25}/></label><div className="connection-actions"><button className="small-button" disabled={busy||!/^\d{10,25}$/.test(messageId)} onClick={()=>action({action:'overview.recover',messageId})}>Use message</button><button className="small-button" disabled={busy} onClick={()=>action({action:'overview.recover'})}>Retry creating</button></div></div>}
    <button className="small-button" disabled={busy||!ready||!current.enabled||Boolean(data.overview?.creation_pending)} onClick={()=>action({action:'overview.refresh'})}>Refresh now</button>
    <details className="notification-preview"><summary>Preview overview</summary><article className="notification-sample"><h3>{preview.title}</h3><p>{preview.description}</p>{preview.fields.map((field,index)=><div className="overview-preview-service" key={index}><strong>{field.name}</strong><p>{field.value}</p></div>)}<p className="notification-test-note">{preview.footer.text}</p></article></details>
  </section>;
}
