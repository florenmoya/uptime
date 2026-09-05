import nodemailer from 'nodemailer';
import {lookup} from 'node:dns/promises';
import {isPublicAddress} from './probe';
import {getNotificationSettings,notificationReadiness} from './notification-settings';
import { pool } from './db';

import {notificationFields,notificationColor,renderEmail,testNotice,type NotificationPayload} from './notification-content';
export type {NotificationPayload} from './notification-content';
export class DeliveryError extends Error {
  constructor(message:string,public retryAfterMs=0,public permanent=false){super(message);}
}
export async function sendDiscord(payload:NotificationPayload,webhook?:string,allowLocalForTest=false):Promise<string> {
  webhook??=(await getNotificationSettings()).discord.webhook;
  const url=new URL(webhook);
  if(!allowLocalForTest&&(url.protocol!=='https:'||url.hostname!=='discord.com'||!/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname))) throw new DeliveryError('Discord webhook configuration is invalid.',0,true);
  url.searchParams.set('wait','true');
  let response:Response;
  try {
    response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({
      username:'Mang Tani',allowed_mentions:{parse:[]},embeds:[{
        title:payload.title.slice(0,256),description:payload.message.slice(0,3800),
        color:parseInt(notificationColor(payload).slice(1),16),
        fields:notificationFields(payload).map(field=>({...field,value:field.value.slice(0,1024),inline:field.name!=='URL'})),
        url:payload.dashboardUrl||undefined,
        timestamp:payload.occurredAt,footer:{text:payload.isTest||payload.kind==='test'?testNotice:'Bayanko Uptime'},
      }],
    })});
  }catch {throw new DeliveryError('Discord connection failed or timed out.');}
  const body=await response.json().catch(()=>({})) as {id?:string;retry_after?:number};
  if(response.status===429) throw new DeliveryError('Discord rate limit; retry scheduled.',Math.max(Number(body.retry_after??response.headers.get('retry-after')??1)*1000,1000));
  if(!response.ok) throw new DeliveryError(`Discord returned HTTP ${response.status}.`,0,response.status>=400&&response.status<500);
  if(!body.id) throw new DeliveryError('Discord did not return a message receipt.');
  return body.id;
}
type SmtpConfig={host:string;port:number;secure:boolean;user:string;password:string;from:string;to:string[]};
export async function createMailTransport(c:SmtpConfig,allowLocalForTest=false){
  if(!c.host||!c.from||!c.to.length) throw new DeliveryError('Email needs SMTP, a sender and recipients.',0,true);
  const localFixture=allowLocalForTest&&(c.host==='127.0.0.1'||c.host==='localhost');
  let host=c.host;
  if(!localFixture){
    let addresses;try{addresses=await lookup(c.host,{all:true});}catch{throw new DeliveryError('SMTP hostname could not be resolved.');}
    if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new DeliveryError('SMTP must use a public mail server.',0,true);
    host=addresses[0].address;
  }
  return nodemailer.createTransport({host,port:c.port,secure:c.secure,tls:localFixture?undefined:{servername:c.host},auth:c.user?{user:c.user,pass:c.password}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,requireTLS:!c.secure&&!localFixture});
}
export async function sendEmail(payload:NotificationPayload,config?:SmtpConfig,allowLocalForTest=false):Promise<string> {
  const c=config??(await getNotificationSettings()).email;
  const transporter=await createMailTransport(c,allowLocalForTest);
  try {
    const info=await transporter.sendMail({from:c.from,to:c.to,subject:payload.title,...renderEmail(payload),disableFileAccess:true,disableUrlAccess:true});
    if(info.rejected?.length) throw new DeliveryError('The mail server rejected one or more recipients.',0,true);
    return String(info.messageId);
  }catch(error) {
    if(error instanceof DeliveryError) throw error;
    throw new DeliveryError('SMTP delivery failed. Check the mail server and credentials.');
  }finally{transporter.close();}
}

export async function dispatchPending():Promise<number> {
  const due=await pool.query(`SELECT d.* FROM deliveries d WHERE d.status='pending' AND d.next_attempt_at<=now()
    AND NOT EXISTS(SELECT 1 FROM deliveries older WHERE older.incident_id=d.incident_id AND older.channel=d.channel AND older.id<d.id AND older.status='pending')
    ORDER BY d.id LIMIT 12`);
  if(!due.rowCount)return 0;
  const config=await getNotificationSettings(),ready=notificationReadiness(config);
  await Promise.all(due.rows.map(async delivery=>{
    try {
      if(!ready[delivery.channel as 'discord'|'email']){
        await pool.query("UPDATE deliveries SET status='canceled',last_error='Notification channel disabled' WHERE id=$1",[delivery.id]);return;
      }
      const providerId=delivery.channel==='discord'?await sendDiscord(delivery.payload,config.discord.webhook):await sendEmail(delivery.payload,config.email);
      await pool.query("UPDATE deliveries SET status='sent',attempts=attempts+1,sent_at=now(),provider_id=$2,last_error=NULL WHERE id=$1",[delivery.id,providerId]);
    }catch(error) {
      const failure=error instanceof DeliveryError?error:new DeliveryError('Delivery failed; see provider configuration.');
      const attempts=Number(delivery.attempts)+1;
      const delay=Math.max(failure.retryAfterMs,Math.min(900000,5000*2**(attempts-1)));
      await pool.query("UPDATE deliveries SET status=$2,attempts=$3,last_error=$4,next_attempt_at=now()+($5::integer*interval '1 millisecond') WHERE id=$1",[delivery.id,failure.permanent||attempts>=8?'failed':'pending',attempts,failure.message,Math.min(delay,2147483647)]);
    }
  }));
  return due.rowCount??0;
}
