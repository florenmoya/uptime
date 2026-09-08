import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {pool,transaction} from './db';
import {settings} from './config';

type DiscordSettings={enabled:boolean;webhook:string};
export type EmailSettings={enabled:boolean;host:string;port:number;secure:boolean;user:string;password:string;from:string;to:string[]};
export type NotificationSettings={discord:DiscordSettings;email:EmailSettings;overview:DiscordSettings};
export type NotificationSettingsView={discord:{enabled:boolean;hasWebhook:boolean};email:Omit<EmailSettings,'password'>&{hasPassword:boolean};overview:{enabled:boolean;hasWebhook:boolean}};
export class NotificationSettingsError extends Error{}

function key(){
  const value=process.env.NOTIFICATION_ENCRYPTION_KEY??'';
  if(!/^[a-f0-9]{64}$/i.test(value))throw new Error('Notification encryption key is not configured.');
  return Buffer.from(value,'hex');
}
function encrypt(channel:string,value:unknown){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  cipher.setAAD(Buffer.from(channel));
  const content=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64'),cipher.getAuthTag().toString('base64'),content.toString('base64')].join('.');
}
function decrypt(channel:string,value:string){
  const [version,iv,tag,content]=value.split('.');
  if(version!=='v1'||!iv||!tag||!content)throw new Error('Invalid notification configuration.');
  const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));
  decipher.setAAD(Buffer.from(channel));decipher.setAuthTag(Buffer.from(tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(content,'base64')),decipher.final()]).toString('utf8'));
}
export async function getNotificationSettings(client:Pool|PoolClient=pool):Promise<NotificationSettings>{
  const env=settings();
  const current:NotificationSettings={
    discord:{enabled:Boolean(env.discordWebhook),webhook:env.discordWebhook},
    overview:{enabled:true,webhook:''},
    email:{enabled:Boolean(env.smtpHost&&env.mailFrom&&env.mailTo.length),host:env.smtpHost,port:env.smtpPort,secure:env.smtpSecure,user:env.smtpUser,password:env.smtpPassword,from:env.mailFrom,to:env.mailTo},
  };
  const saved=await client.query('SELECT channel,encrypted_config FROM notification_settings');
  for(const row of saved.rows){
    if(row.channel==='discord')current.discord=decrypt('discord',row.encrypted_config);
    if(row.channel==='email')current.email=decrypt('email',row.encrypted_config);
    if(row.channel==='overview')current.overview=decrypt('overview',row.encrypted_config);
  }
  return current;
}
export function notificationReadiness(current:NotificationSettings){
  return {discord:current.discord.enabled&&Boolean(current.discord.webhook),email:current.email.enabled&&Boolean(current.email.host&&current.email.from&&current.email.to.length)};
}
export function notificationSettingsView(current:NotificationSettings):NotificationSettingsView{
  const {password,...email}=current.email;
  return {discord:{enabled:current.discord.enabled,hasWebhook:Boolean(current.discord.webhook)},email:{...email,hasPassword:Boolean(password)},overview:{enabled:current.overview.enabled,hasWebhook:Boolean(current.overview.webhook)}};
}
function field(value:unknown,label:string,max:number,required=true){
  if(typeof value!=='string'||value.length>max||/[\r\n\0]/.test(value)||(required&&!value.trim()))throw new NotificationSettingsError(`Enter a valid ${label}.`);
  return value.trim();
}
function mailbox(value:string){return /^[^\s<>@,]+@[^\s<>@,]+\.[^\s<>@,]+$/.test(value);}
export async function saveNotificationSettings(input:Record<string,unknown>){
  const channel=input.channel;
  if(channel!=='discord'&&channel!=='email'&&channel!=='overview')throw new NotificationSettingsError('Choose a notification channel.');
  if(typeof input.enabled!=='boolean')throw new NotificationSettingsError('Choose whether the channel is enabled.');
  const enabled=input.enabled;
  await transaction(async client=>{
    await client.query('SELECT id FROM app_settings WHERE id=true FOR UPDATE');
    const current=await getNotificationSettings(client);
    let next:DiscordSettings|EmailSettings;
    if(channel==='discord'||channel==='overview'){
      const replacement=field(input.webhook??'','Discord webhook URL',500,false);
      const webhook=channel==='overview'
        ?input.useIncidentWebhook===true?current.discord.webhook:replacement||current.overview.webhook||current.discord.webhook
        :replacement||current.discord.webhook;
      if(webhook){
        let valid=false;try{const url=new URL(webhook);valid=url.origin==='https://discord.com'&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname);}catch{}
        if(!valid)throw new NotificationSettingsError('Enter a valid Discord webhook URL.');
      }
      if(enabled&&!webhook)throw new NotificationSettingsError('Enter a Discord webhook URL.');
      next={enabled,webhook};
    }else{
      const host=field(input.host,'SMTP host',253,enabled);
      if(host&&!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host))throw new NotificationSettingsError('Enter an SMTP hostname, such as smtp.gmail.com.');
      const port=Number(input.port);
      if(![25,465,587,2525].includes(port))throw new NotificationSettingsError('Use SMTP port 25, 465, 587, or 2525.');
      const user=field(input.user??'','SMTP username',254,false);
      field(input.password??'','SMTP password',1024,false);
      const replacement=typeof input.password==='string'?input.password:'';
      const password=replacement||current.email.password;
      const from=field(input.from,'sender address',320,enabled);
      const fromAddress=from.match(/^[^<>]+<([^<>]+)>$/)?.[1]??from;
      if(from&&!mailbox(fromAddress))throw new NotificationSettingsError('Enter a valid sender email address.');
      const to=field(input.to,'recipient addresses',2000,enabled).split(',').map(s=>s.trim()).filter(Boolean);
      if(to.length>20||to.some(address=>!mailbox(address)))throw new NotificationSettingsError('Enter up to 20 email addresses, separated by commas.');
      if(user&&!password&&enabled)throw new NotificationSettingsError('Enter the SMTP password.');
      next={enabled,host,port,secure:port===465,user,password,from,to:[...new Set(to)]};
    }
    // Preserve legacy overview destinations before changing incident settings.
    if(channel==='discord'&&!current.overview.webhook&&current.discord.webhook){
      await client.query(`INSERT INTO notification_settings(channel,encrypted_config) VALUES('overview',$1)
        ON CONFLICT(channel) DO UPDATE SET encrypted_config=EXCLUDED.encrypted_config,updated_at=now()`,[encrypt('overview',{...current.overview,webhook:current.discord.webhook})]);
    }
    await client.query(`INSERT INTO notification_settings(channel,encrypted_config) VALUES($1,$2)
      ON CONFLICT(channel) DO UPDATE SET encrypted_config=EXCLUDED.encrypted_config,updated_at=now()`,[channel,encrypt(channel,next)]);
    if(!next.enabled)await client.query("UPDATE deliveries SET status='canceled',last_error='Notification channel disabled' WHERE channel=$1 AND status='pending'",[channel]);
    if(channel==='overview'||channel==='discord')await client.query('UPDATE overview_message SET next_attempt_at=now() WHERE id=true');
  });
  return `${channel==='discord'?'Discord':channel==='overview'?'Overview':'Email'} settings saved.`;
}
