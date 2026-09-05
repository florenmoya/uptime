import type {ProbeResult} from './probe';

export type NotificationPayload={title:string;message:string;monitorName:string;url:string;kind:'down'|'recovered'|'test';occurredAt:string;isTest?:boolean;project?:string;incidentId?:string;startedAt?:string;durationSeconds?:number;httpStatus?:number|null;latencyMs?:number;intervalSeconds?:number;dashboardUrl?:string};
type Monitor={name:string;url:string;project?:string;interval_seconds?:number};
export const TEST_SCENARIOS=[
  {id:'http',label:'HTTP error'},
  {id:'timeout',label:'Timeout'},
  {id:'dns',label:'DNS error'},
  {id:'tls',label:'TLS certificate error'},
  {id:'connection',label:'Connection error'},
  {id:'redirect',label:'Redirect error'},
  {id:'target',label:'Invalid target'},
  {id:'recovered',label:'Recovery'},
] as const;
export type TestScenario=typeof TEST_SCENARIOS[number]['id'];

export function buildIncidentNotification(input:{monitor:Monitor;kind:'down'|'recovered';occurredAt:string;startedAt:string;incidentId?:string;result:ProbeResult;dashboardUrl:string;isTest?:boolean}):NotificationPayload{
  const {monitor,kind,result,occurredAt,startedAt}=input;
  const cause=result.error==='Check timed out.'?'Check timed out after 10 seconds.':result.error==='HTTP 503'?'HTTP 503 — Service unavailable.':result.error??'The target did not respond successfully.';
  return {
    title:`${input.isTest?'[TEST] ':''}${kind==='down'?'🔴 DOWN':'✅ RECOVERED'} — ${monitor.name}`,
    message:kind==='down'?cause:'Service is back online.',
    monitorName:monitor.name,url:monitor.url,project:monitor.project,kind,occurredAt,startedAt,incidentId:input.incidentId,
    isTest:Boolean(input.isTest),durationSeconds:kind==='recovered'?Math.max(0,Math.floor((Date.parse(occurredAt)-Date.parse(startedAt))/1000)):undefined,
    httpStatus:result.httpStatus,latencyMs:result.latencyMs,intervalSeconds:monitor.interval_seconds??60,dashboardUrl:input.dashboardUrl,
  };
}

export function buildTestNotifications(monitor:Monitor,scenario:TestScenario|'all',occurredAt:string,dashboardUrl:string):NotificationPayload[]{
  const results:Record<TestScenario,ProbeResult>={
    http:{ok:false,httpStatus:503,latencyMs:240,error:'HTTP 503'},
    timeout:{ok:false,httpStatus:null,latencyMs:10000,error:'Check timed out after 10 seconds.'},
    dns:{ok:false,httpStatus:null,latencyMs:120,error:'DNS name not found.'},
    tls:{ok:false,httpStatus:null,latencyMs:180,error:'TLS certificate expired.'},
    connection:{ok:false,httpStatus:null,latencyMs:80,error:'Connection refused.'},
    redirect:{ok:false,httpStatus:null,latencyMs:900,error:'Too many redirects.'},
    target:{ok:false,httpStatus:null,latencyMs:15,error:'The target must resolve to a public internet address.'},
    recovered:{ok:true,httpStatus:200,latencyMs:185,error:null},
  };
  return (scenario==='all'?TEST_SCENARIOS.map(s=>s.id):[scenario]).map(id=>buildIncidentNotification({monitor,kind:id==='recovered'?'recovered':'down',occurredAt,startedAt:id==='recovered'?new Date(Date.parse(occurredAt)-300000).toISOString():occurredAt,result:results[id],dashboardUrl,incidentId:'sample',isTest:true}));
}

function time(value:string){return new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Manila'}).format(new Date(value))+' PHT';}
function duration(seconds:number){const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return `${h?`${h}h `:''}${m}m ${s}s`;}
export function notificationFields(payload:NotificationPayload):{name:string;value:string}[]{
  const fields:{name:string;value:string}[]=[];
  if(payload.url)fields.push({name:'URL',value:payload.url});
  fields.push({name:'Time',value:time(payload.occurredAt)});
  if(payload.kind==='recovered'&&payload.durationSeconds!==undefined)fields.push({name:'Downtime',value:duration(payload.durationSeconds)});
  return fields;
}
export const testNotice='Test notification';
export function notificationColor(payload:NotificationPayload){return payload.kind==='down'?'#b3293e':payload.kind==='recovered'?'#17734d':'#365f95';}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));}
export function renderEmail(payload:NotificationPayload){
  const fields=notificationFields(payload);
  const notice=payload.isTest||payload.kind==='test'?testNotice:'';
  let link='';try{const url=new URL(payload.dashboardUrl??'');if(['http:','https:'].includes(url.protocol))link=url.href;}catch{}
  return {
    text:[payload.message,...fields.map(f=>`${f.name}: ${f.value}`),link?`Dashboard: ${link}`:'',notice].filter(Boolean).join('\n\n'),
    html:`<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#202d42;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;background:#fff;padding:28px"><h1 style="font-size:22px;color:${notificationColor(payload)}">${escapeHtml(payload.title)}</h1><p style="line-height:1.6">${escapeHtml(payload.message).replace(/\n/g,'<br>')}</p><table style="width:100%;border-collapse:collapse">${fields.map(f=>`<tr><th scope="row" style="text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid #e0e6ee;font-size:13px">${escapeHtml(f.name)}</th><td style="padding:10px 0;border-bottom:1px solid #e0e6ee;font-size:13px;overflow-wrap:anywhere">${escapeHtml(f.value)}</td></tr>`).join('')}</table>${link?`<p><a href="${escapeHtml(link)}" style="color:#254875">View dashboard</a></p>`:''}${notice?`<p style="font-size:12px;color:#5c687b">${notice}</p>`:''}</main></body></html>`,
  };
}
