'use client';
import { useState } from 'react';
import { ExternalLink,Globe2,Pencil,Plus } from 'lucide-react';
import type { DashboardData,StatusPageView } from '@/lib/dashboard';
import type { Action } from './format';

function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);}

function PageEditor({page,data,action,busy,onClose}:{page:StatusPageView|null;data:DashboardData;action:Action;busy:boolean;onClose:()=>void}){
  const [title,setTitle]=useState(page?.title??''),[slug,setSlug]=useState(page?.slug??''),[slugTouched,setSlugTouched]=useState(Boolean(page));
  const [description,setDescription]=useState(page?.description??''),[published,setPublished]=useState(page?.published??true);
  const [monitorIds,setMonitorIds]=useState<string[]>(page?.monitorIds??data.monitors.map(m=>m.id));
  function toggle(id:string){setMonitorIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);}
  async function submit(event:React.FormEvent){
    event.preventDefault();
    const saved=await action({action:'status-page.save',id:page?.id,title,slug,description,published,monitorIds});
    if(saved)onClose();
  }
  return <form className="status-page-form" onSubmit={submit}>
    <div className="status-form-grid">
      <label>Page name<input required maxLength={100} value={title} onChange={event=>{setTitle(event.target.value);if(!slugTouched)setSlug(slugify(event.target.value));}} placeholder="PhilGEPS System Status"/></label>
      <label>Public URL<span className="slug-input"><span>/status/</span><input required minLength={3} maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={event=>{setSlugTouched(true);setSlug(event.target.value.toLowerCase());}} placeholder="philgeps"/></span></label>
      <label className="status-description">Description<textarea maxLength={280} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Current availability of PhilGEPS services."/><span>{description.length}/280</span></label>
    </div>
    <fieldset><legend>Services shown</legend><p>Visitors see service names and health history. Target URLs and technical errors stay private.</p><div className="monitor-choices">{data.monitors.map(m=><label key={m.id}><input type="checkbox" checked={monitorIds.includes(m.id)} onChange={()=>toggle(m.id)}/><span>{m.name}</span></label>)}</div></fieldset>
    <label className="publish-choice"><input type="checkbox" checked={published} onChange={event=>setPublished(event.target.checked)}/><span><strong>Publish this page</strong><small>Anyone with its URL can view it. Uncheck to keep it private.</small></span></label>
    <div className="form-actions"><button type="button" className="small-button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-button" disabled={busy||monitorIds.length===0}>{busy?'Saving…':published?'Save and publish':'Save draft'}</button></div>
  </form>;
}

export default function PublicPages({data,action,busy}:{data:DashboardData;action:Action;busy:boolean}){
  const [editing,setEditing]=useState<StatusPageView|null|undefined>(undefined);
  return <section className="section-block public-pages-admin">
    <div className="section-heading"><div><h2>Public status pages</h2></div>{editing===undefined&&<button className="small-button" onClick={()=>setEditing(null)}><Plus size={15}/>Create public page</button>}</div>
    {editing!==undefined?<PageEditor key={editing?.id??'new'} page={editing} data={data} action={action} busy={busy} onClose={()=>setEditing(undefined)}/>:
      data.statusPages.length?<div className="public-page-list">{data.statusPages.map(page=><div className="public-page-row" key={page.id}><span className="public-page-icon"><Globe2 size={18}/></span><div><strong>{page.title}</strong><span>/status/{page.slug} · {page.monitorIds.length} service{page.monitorIds.length===1?'':'s'}</span></div><span className={`page-visibility ${page.published?'published':''}`}>{page.published?'Published':'Draft'}</span>{page.published&&<a className="small-button" href={`/status/${page.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Open page</a>}<button className="small-button" onClick={()=>setEditing(page)}><Pencil size={14}/>Edit</button></div>)}</div>:
      <div className="empty-state compact"><Globe2 size={24}/><div><h3>No public pages yet</h3><p>Create one when you are ready to share service health.</p></div></div>}
  </section>;
}
