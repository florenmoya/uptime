import {createHash} from 'node:crypto';
import {pool} from './db';
import {settings} from './config';
import {getNotificationSettings} from './notification-settings';
import {getDashboard} from './dashboard';
import {buildOverview} from './overview-content';

export class OverviewError extends Error{
  constructor(message:string,public retryMs=60000,public missingMessage=false,public uncertain=false){super(message);}
}
export async function writeOverview(webhook:string,messageId:string|null,payload:ReturnType<typeof buildOverview>,allowLocalForTest=false):Promise<string>{
  const url=new URL(webhook);
  if(!allowLocalForTest&&(url.origin!=='https://discord.com'||!/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)))throw new OverviewError('Invalid overview webhook.',300000);
  if(messageId){if(!/^\d+$/.test(messageId))throw new OverviewError('Invalid overview message ID.',300000);url.pathname+=`/messages/${messageId}`;}else url.searchParams.set('wait','true');
  let response:Response;
  try{response=await fetch(url,{method:messageId?'PATCH':'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch{throw new OverviewError(messageId?'Overview update timed out.':'Creation was not confirmed. Enter the message ID or retry creating.',60000,false,!messageId);}
  const body=await response.json().catch(()=>({})) as {id?:string;code?:number;retry_after?:number};
  if(response.status===404&&body.code===10008&&messageId)throw new OverviewError('Overview message was deleted.',0,true);
  if(response.status===429)throw new OverviewError('Discord rate limit; retry scheduled.',Math.max(1000,Number(body.retry_after??response.headers.get('retry-after')??60)*1000));
  if(!response.ok)throw new OverviewError(`Discord returned HTTP ${response.status}.`,response.status>=500?60000:300000,false,!messageId&&response.status>=500);
  if(!body.id||!/^\d+$/.test(body.id))throw new OverviewError('Discord did not confirm the message ID.',60000,false,!messageId);
  return body.id;
}
export async function refreshOverview(write=writeOverview){
  const claimed=await pool.query("UPDATE overview_message SET next_attempt_at=now()+interval '90 seconds' WHERE id=true AND next_attempt_at<=now() RETURNING *");
  if(!claimed.rowCount)return;
  const state=claimed.rows[0];
  try{
    const config=await getNotificationSettings(),webhook=config.overview.webhook||config.discord.webhook;
    if(!config.overview.enabled||!webhook){await pool.query("UPDATE overview_message SET next_attempt_at=now()+interval '60 seconds',last_error=NULL WHERE id=true");return;}
    const fingerprint=createHash('sha256').update(webhook).digest('hex');
    if(state.webhook_hash!==fingerprint){
      state.message_id=null;state.creation_pending=false;
      await pool.query('UPDATE overview_message SET webhook_hash=$1,message_id=NULL,creation_pending=false,last_updated_at=NULL WHERE id=true',[fingerprint]);
    }
    if(state.creation_pending){await pool.query("UPDATE overview_message SET last_error='Creation was not confirmed. Enter the message ID or retry creating.',next_attempt_at=now()+interval '5 minutes' WHERE id=true");return;}
    const dashboard=await getDashboard(),payload=buildOverview(dashboard.monitors,dashboard.now,settings().appUrl);
    const create=async()=>{
      await pool.query('UPDATE overview_message SET creation_pending=true,message_id=NULL,last_error=NULL WHERE id=true');
      return write(webhook,null,payload);
    };
    let messageId:string;
    if(state.message_id){
      try{messageId=await write(webhook,state.message_id,payload);}catch(error){if(error instanceof OverviewError&&error.missingMessage)messageId=await create();else throw error;}
    }else messageId=await create();
    await pool.query("UPDATE overview_message SET message_id=$1,creation_pending=false,last_updated_at=now(),next_attempt_at=now()+interval '60 seconds',last_error=NULL WHERE id=true",[messageId]);
  }catch(error){
    const failure=error instanceof OverviewError?error:new OverviewError('Overview could not be updated.',60000,false,true);
    await pool.query("UPDATE overview_message SET last_error=$1,creation_pending=CASE WHEN $2 THEN creation_pending ELSE false END,next_attempt_at=now()+($3::integer*interval '1 millisecond') WHERE id=true",[failure.message,failure.uncertain,Math.min(3600000,Math.max(1000,failure.retryMs))]);
  }
}
