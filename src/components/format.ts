import type { MonitorView } from '@/lib/dashboard';
export function relative(value:string|null,now:string){
  if(!value)return 'Not checked yet';
  const seconds=Math.max(0,Math.floor((new Date(now).getTime()-new Date(value).getTime())/1000));
  if(seconds<5)return 'Just now';if(seconds<60)return `${seconds}s ago`;if(seconds<3600)return `${Math.floor(seconds/60)}m ago`;return `${Math.floor(seconds/3600)}h ago`;
}
export function timestamp(value:string){return new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(value));}
export function statusOf(m:MonitorView,now:string){
  if(!m.url)return {key:'setup',label:'Needs URL'};
  if(!m.enabled)return {key:'paused',label:'Paused'};
  if(!m.last_checked_at)return {key:'unknown',label:'Awaiting check'};
  if(new Date(now).getTime()-new Date(m.last_checked_at).getTime()>m.interval_seconds*2000+10000)return {key:'unknown',label:'No recent check'};
  if(m.status==='down')return {key:'down',label:m.successes===1?'Verifying recovery':'Down'};
  if(m.failures===1)return {key:'checking',label:'Confirming failure'};
  if(m.status==='up')return {key:'up',label:'Operational'};
  return {key:'unknown',label:'Awaiting check'};
}
export type Action=(input:Record<string,unknown>)=>Promise<boolean>;
