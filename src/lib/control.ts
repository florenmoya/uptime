import { randomUUID,createHash } from 'node:crypto';
import { pool,transaction } from './db';
import { validateTarget } from './probe';
import { settings } from './config';
import {getNotificationSettings,notificationReadiness,saveNotificationSettings,NotificationSettingsError} from './notification-settings';
import { buildTestNotifications,TEST_SCENARIOS,type TestScenario } from './notification-content';

export class InputError extends Error{}
function text(value:unknown,label:string,max:number) {if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new InputError(`${label} must contain 1–${max} characters.`);return value.trim();}

export async function control(input:Record<string,unknown>):Promise<string> {
  if(input.action==='overview.refresh'){
    const result=await pool.query("UPDATE overview_message SET next_attempt_at=now() WHERE id=true AND NOT creation_pending AND last_error IS NULL AND (last_updated_at IS NULL OR last_updated_at<now()-interval '15 seconds')");
    return result.rowCount?'Overview refresh queued.':'The overview was just updated or a retry is already scheduled.';
  }
  if(input.action==='overview.recover'){
    if(input.messageId!==undefined&&(typeof input.messageId!=='string'||!/^\d{10,25}$/.test(input.messageId)))throw new InputError('Enter a valid Discord message ID.');
    await transaction(async client=>{
      await client.query('SELECT id FROM app_settings WHERE id=true FOR UPDATE');
      const config=await getNotificationSettings(client),webhook=config.overview.webhook||config.discord.webhook;
      if(!webhook||!config.overview.enabled)throw new InputError('Configure and enable the overview first.');
      const result=await client.query('UPDATE overview_message SET message_id=$1,webhook_hash=$2,creation_pending=false,last_error=NULL,next_attempt_at=now() WHERE id=true AND creation_pending AND last_error IS NOT NULL',[input.messageId??null,createHash('sha256').update(webhook).digest('hex')]);
      if(!result.rowCount)throw new InputError('Overview creation does not need recovery.');
    });
    return 'Overview recovery queued.';
  }
  if(input.action==='notifications.save'){
    try{return await saveNotificationSettings(input);}catch(error){if(error instanceof NotificationSettingsError)throw new InputError(error.message);throw error;}
  }
  if(input.action==='status-page.save'){
    const title=text(input.title,'Title',100);
    const slug=typeof input.slug==='string'?input.slug.trim():'';
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<3||slug.length>60)throw new InputError('Public URL must use 3–60 lowercase letters, numbers, and single hyphens.');
    const description=typeof input.description==='string'?input.description.trim():'';
    if(description.length>280)throw new InputError('Description must contain no more than 280 characters.');
    if(typeof input.published!=='boolean')throw new InputError('Choose whether the public page is published.');
    if(!Array.isArray(input.monitorIds)||input.monitorIds.some(id=>typeof id!=='string')||input.monitorIds.length<1||input.monitorIds.length>20)throw new InputError('Choose between 1 and 20 services.');
    const monitorIds=[...new Set(input.monitorIds as string[])];
    if(monitorIds.length!==input.monitorIds.length)throw new InputError('Choose each service only once.');
    const suppliedId=input.id;
    if(suppliedId!==undefined&&(typeof suppliedId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId)))throw new InputError('Public page not found.');
    const id=typeof suppliedId==='string'?suppliedId:randomUUID();
    try{
      await transaction(async client=>{
        const selected=await client.query('SELECT id FROM monitors WHERE id=ANY($1::text[])',[monitorIds]);
        if(selected.rowCount!==monitorIds.length)throw new InputError('One or more selected services no longer exist.');
        if(suppliedId){
          const updated=await client.query('UPDATE status_pages SET title=$2,slug=$3,description=$4,published=$5,updated_at=now() WHERE id=$1',[id,title,slug,description,input.published]);
          if(!updated.rowCount)throw new InputError('Public page not found.');
        }else await client.query('INSERT INTO status_pages(id,title,slug,description,published) VALUES($1,$2,$3,$4,$5)',[id,title,slug,description,input.published]);
        await client.query('DELETE FROM status_page_monitors WHERE status_page_id=$1',[id]);
        await client.query(`INSERT INTO status_page_monitors(status_page_id,monitor_id,display_order)
          SELECT $1,monitor_id,ordinality::integer-1 FROM unnest($2::text[]) WITH ORDINALITY AS selected(monitor_id,ordinality)`,[id,monitorIds]);
      });
    }catch(error){
      if(error instanceof InputError)throw error;
      if((error as {code?:string}).code==='23505')throw new InputError('That public URL is already in use.');
      throw error;
    }
    return input.published?'Public page published.':'Public page saved as draft.';
  }
  if(input.action==='check'){
    const result=await pool.query("UPDATE monitors SET next_check_at=now() WHERE enabled AND url IS NOT NULL AND (last_checked_at IS NULL OR last_checked_at<now()-interval '15 seconds') AND ($1::text IS NULL OR id=$1)",[typeof input.id==='string'?input.id:null]);
    return result.rowCount?'Checks requested. The worker will pick them up shortly.':'These monitors were just checked. Try again in a few seconds.';
  }
  if(input.action==='alerts'){
    if(typeof input.enabled!=='boolean')throw new InputError('Choose whether automatic alerts are enabled.');
    await transaction(async client=>{
      await client.query('UPDATE app_settings SET alerts_enabled=$1 WHERE id=true',[input.enabled]);
      if(!input.enabled)await client.query("UPDATE deliveries SET status='canceled',last_error='Automatic alerts paused by owner' WHERE status='pending' AND payload->>'kind'!='test' AND payload->>'isTest' IS DISTINCT FROM 'true'");
    });
    return input.enabled?'Automatic alerts enabled for future incident changes.':'Automatic alerts paused.';
  }
  if(input.action==='test'){
    const channel=input.channel;
    if(channel!=='discord'&&channel!=='email')throw new InputError('Choose Discord or email.');
    const scenario=input.scenario??'http';
    if(scenario!=='all'&&!TEST_SCENARIOS.some(s=>s.id===scenario))throw new InputError('Choose a valid test scenario.');
    const monitorId=text(input.monitorId,'Monitor',80);
    return transaction(async client=>{
      await client.query('SELECT id FROM app_settings WHERE id=true FOR UPDATE');
      if(!notificationReadiness(await getNotificationSettings(client))[channel])throw new InputError(`Configure and enable ${channel==='email'?'email':'Discord'} first.`);
      const monitor=(await client.query('SELECT name,url,project,interval_seconds FROM monitors WHERE id=$1 AND url IS NOT NULL',[monitorId])).rows[0];
      if(!monitor)throw new InputError('Choose a monitor with a target URL.');
      const recent=await client.query("SELECT 1 FROM deliveries WHERE channel=$1 AND (payload->>'kind'='test' OR payload->>'isTest'='true') AND created_at>now()-interval '1 minute'",[channel]);
      if(recent.rowCount)throw new InputError('A test was already requested within the last minute. Check delivery history.');
      const samples=buildTestNotifications(monitor,scenario as TestScenario|'all',new Date().toISOString(),settings().appUrl);
      const batch=randomUUID();
      for(const [index,payload] of samples.entries())await client.query("INSERT INTO deliveries(event_key,channel,payload,next_attempt_at) VALUES($1,$2,$3,now()+($4::integer*interval '1 second'))",[`test:${batch}:${index}`,channel,JSON.stringify(payload),index*3]);
      return `${samples.length===1?'Test':`${samples.length} tests`} queued. Check delivery history for results.`;
    });
  }
  if(input.action==='update'){
    const id=text(input.id,'Monitor',80),name=text(input.name,'Name',120),project=text(input.project,'Project',60);
    if(typeof input.enabled!=='boolean')throw new InputError('Choose whether the monitor is enabled.');
    const raw=typeof input.url==='string'?input.url.trim():'';
    let url:string|null=null;
    try{url=raw?validateTarget(raw):null;}catch(error){throw new InputError(error instanceof Error?error.message:'Invalid URL.');}
    if(url&&url.length>2000)throw new InputError('The target URL is too long.');
    await transaction(async client=>{
      const old=(await client.query('SELECT * FROM monitors WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!old)throw new InputError('Monitor not found.');
      const reset=old.url!==url||old.enabled!==input.enabled;
      if(reset){
        await client.query("UPDATE incidents SET resolved_at=now(),resolution='Monitoring configuration changed; not a verified recovery' WHERE monitor_id=$1 AND resolved_at IS NULL",[id]);
        await client.query("UPDATE deliveries SET status='canceled',last_error='Monitor configuration changed' WHERE incident_id IN(SELECT id FROM incidents WHERE monitor_id=$1) AND status='pending'",[id]);
        await client.query("UPDATE monitors SET status='unknown',failures=0,successes=0,version=version+1,last_checked_at=NULL,last_http_status=NULL,last_latency_ms=NULL,last_error=NULL,next_check_at=now() WHERE id=$1",[id]);
      }
      await client.query('UPDATE monitors SET name=$2,project=$3,url=$4,enabled=$5 WHERE id=$1',[id,name,project,url,input.enabled]);
    });
    return 'Monitor saved.';
  }
  throw new InputError('Unknown action.');
}
