'use client';
import {useState} from 'react';
import {ArrowDown,ArrowUp} from 'lucide-react';
import type {MonitorView} from '@/lib/dashboard';
import type {Action} from './format';

export default function MonitorOrder({monitors,action,busy}:{monitors:MonitorView[];action:Action;busy:boolean}){
  const [draft,setDraft]=useState<string[]|null>(null);
  const [announcement,setAnnouncement]=useState('');
  const ids=draft??monitors.map(m=>m.id);
  const byId=new Map(monitors.map(m=>[m.id,m]));
  const changed=ids.length!==monitors.length||ids.some((id,index)=>id!==monitors[index]?.id);
  function move(index:number,direction:number){
    const next=[...ids],destination=index+direction;
    if(busy||destination<0||destination>=next.length)return;
    [next[index],next[destination]]=[next[destination],next[index]];
    setDraft(next);
    setAnnouncement(`${byId.get(ids[index])?.name??'Monitor'} moved to position ${destination+1} of ${ids.length}.`);
  }
  async function save(){if(await action({action:'monitors.reorder',monitorIds:ids})){setDraft(null);setAnnouncement('Monitor order saved.');}}
  return <section className="section-block" aria-labelledby="monitor-order-heading">
    <h2 id="monitor-order-heading">Monitor order</h2>
    <p className="section-description">Dashboard, public status pages, and Discord overview.</p>
    <ol className="monitor-order-list" aria-label="Monitor order">
      {ids.map((id,index)=><li key={id}>
        <span className="monitor-order-position" aria-hidden="true">{index+1}</span>
        <span className="monitor-order-name">{byId.get(id)?.name??'Monitor removed'}</span>
        <div className="monitor-order-actions">
          <button type="button" className="small-button" aria-label={`Move ${byId.get(id)?.name??'monitor'} up`} title="Move up" disabled={busy||index===0} onClick={()=>move(index,-1)}><ArrowUp size={17} aria-hidden="true"/></button>
          <button type="button" className="small-button" aria-label={`Move ${byId.get(id)?.name??'monitor'} down`} title="Move down" disabled={busy||index===ids.length-1} onClick={()=>move(index,1)}><ArrowDown size={17} aria-hidden="true"/></button>
        </div>
      </li>)}
    </ol>
    {!ids.length&&<p className="section-description">No monitors configured.</p>}
    <div className="connection-actions">
      <button type="button" className="primary-button" disabled={busy||!changed||!ids.length} onClick={()=>void save()}>Save order</button>
      {draft&&<button type="button" className="small-button" disabled={busy} onClick={()=>{setDraft(null);setAnnouncement('Changes canceled.');}}>Cancel</button>}
    </div>
    <p className="sr-only" role="status">{announcement}</p>
  </section>;
}
