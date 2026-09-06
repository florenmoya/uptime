'use client';
import { useState } from 'react';
import type { Action } from './format';

export default function AddMonitor({projects,action,busy,onClose,onCreated}:{projects:string[];action:Action;busy:boolean;onClose:()=>void;onCreated:()=>void}){
  const [name,setName]=useState(''),[url,setUrl]=useState(''),[project,setProject]=useState('');
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(busy)return;
    if(await action({action:'monitors.create',name,url,project}))onCreated();
  }
  return <form id="add-monitor" className="connection-form add-monitor-form" aria-labelledby="add-monitor-title" onSubmit={submit}>
    <h2 id="add-monitor-title">Add monitor</h2>
    <fieldset disabled={busy}>
      <div className="connection-grid">
        <label>Name<input autoFocus required maxLength={120} value={name} onChange={event=>setName(event.target.value)} placeholder="My website"/></label>
        <label>Project<input required maxLength={60} list="monitor-projects" value={project} onChange={event=>setProject(event.target.value)} placeholder="Choose or enter a project"/></label>
        <datalist id="monitor-projects">{projects.map(value=><option key={value} value={value}/>)}</datalist>
        <label className="add-monitor-url">URL<input required type="url" maxLength={2000} value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://example.com" autoCapitalize="none" spellCheck={false}/></label>
      </div>
      <div className="connection-actions"><button className="primary-button" type="submit">{busy?'Adding…':'Create monitor'}</button><button className="small-button" type="button" onClick={onClose}>Cancel</button></div>
    </fieldset>
  </form>;
}
