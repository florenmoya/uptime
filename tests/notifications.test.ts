import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { SMTPServer } from 'smtp-server';
import { sendDiscord,sendEmail } from '../src/lib/notifications.js';
import {buildIncidentNotification,buildTestNotifications,renderEmail,notificationFields,TEST_SCENARIOS} from '../src/lib/notification-content.js';
import {buildOverview,overviewHistory} from '../src/lib/overview-content.js';
import {writeOverview,OverviewError} from '../src/lib/discord-overview.js';
import type {MonitorView} from '../src/lib/dashboard.js';

test('overview renders honest stale states, history gaps and observed-check percentages',()=>{
  const now='2026-09-05T16:00:00.000Z';
  const monitor={name:'FACT PROD',url:'https://example.com',enabled:true,status:'up',failures:0,successes:2,interval_seconds:60,last_checked_at:now,last_latency_ms:80,total:200,passed:199,coverage:48,history:[{minute:now,ok:true}]} as MonitorView;
  const message=buildOverview([monitor],now,'https://uptime.example.com');
  assert.equal(message.embeds[0].url,'https://uptime.example.com/status/philgeps');
  assert.match(message.embeds[0].description,/All 1 services operational/);
  assert.match(message.embeds[0].fields[0].value,/24h checks: 99.50%/);
  assert.equal(overviewHistory(monitor,now),Array(5).fill('⬜').concat('🟩').join(' '));
  assert.equal(overviewHistory({...monitor,history:[{minute:'2026-09-05T15:01:00Z',ok:true},{minute:'2026-09-05T15:11:00Z',ok:false},{minute:now,ok:true}]},now),'🟩 🟥 ⬜ ⬜ ⬜ 🟩');
  assert.equal(overviewHistory({...monitor,history:[...monitor.history,{minute:'2026-09-05T15:55:00Z',ok:false}]},now),'⬜ ⬜ ⬜ ⬜ ⬜ 🟥');
  assert.ok(message.embeds[0].footer.text.includes('10 min/block'));
  assert.match(buildOverview([{...monitor,last_checked_at:'2026-09-05T15:00:00Z'}],now,'').embeds[0].fields[0].value,/No recent check/);
  assert.equal(buildOverview([{...monitor,total:0}],now,'').embeds[0].fields[0].value.includes('24h checks: No data'),true);
  assert.equal(buildOverview(Array.from({length:30},()=>monitor),now,'').embeds[0].fields.length,20);
});

test('overview transport creates once, edits by ID, and distinguishes deleted messages from invalid webhooks',async()=>{
  let status=200;let result:Record<string,unknown>={id:'10000000001'};
  const requests:{method?:string;path?:string;body:Record<string,unknown>}[]=[];
  const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;requests.push({method:req.method,path:req.url,body:JSON.parse(body)});res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(result));});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const webhook=`http://127.0.0.1:${(server.address() as {port:number}).port}/webhook`;
    const payload=buildOverview([],'2026-09-05T16:00:00Z','https://uptime.example.com');
    const id=await writeOverview(webhook,null,payload,true);
    await writeOverview(webhook,id,payload,true);
    assert.equal(requests[0].method,'POST');assert.equal(requests[0].path,'/webhook?wait=true');
    assert.equal(requests[1].method,'PATCH');assert.equal(requests[1].path,'/webhook/messages/10000000001');
    assert.deepEqual(requests[1].body.allowed_mentions,{parse:[]});
    status=404;result={code:10008};
    await assert.rejects(writeOverview(webhook,id,payload,true),(error:unknown)=>error instanceof OverviewError&&error.missingMessage);
    result={code:10015};
    await assert.rejects(writeOverview(webhook,id,payload,true),(error:unknown)=>error instanceof OverviewError&&!error.missingMessage);
    status=429;result={retry_after:2.5};
    await assert.rejects(writeOverview(webhook,id,payload,true),(error:unknown)=>error instanceof OverviewError&&error.retryMs===2500);
    status=502;result={};
    await assert.rejects(writeOverview(webhook,null,payload,true),(error:unknown)=>error instanceof OverviewError&&error.uncertain);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('incident samples use the real templates, distinguish every supported scenario and escape email HTML',()=>{
  const monitor={name:'FACT <PROD>',url:'https://example.com/?q=<script>',project:'FACT',interval_seconds:60};
  const occurredAt='2026-09-05T16:00:00.000Z';
  const samples=buildTestNotifications(monitor,'all',occurredAt,'https://uptime.example.com/');
  assert.equal(samples.length,TEST_SCENARIOS.length);
  assert.equal(new Set(samples.map(p=>p.message)).size,samples.length);
  for(const sample of samples){assert.equal(sample.isTest,true);assert.match(sample.title,/^\[TEST\]/);assert.equal(sample.url,monitor.url);assert.ok(notificationFields(sample).some(f=>f.name==='Time'&&f.value.includes('PHT')));}
  const recovery=samples.find(p=>p.kind==='recovered')!;
  assert.deepEqual(notificationFields(recovery).map(f=>f.name),['URL','Time','Downtime']);
  assert.ok(notificationFields(recovery).some(f=>f.name==='Downtime'&&f.value==='5m 0s'));
  assert.match(recovery.title,/✅ RECOVERED/);
  assert.equal(recovery.message,'Service is back online.');
  const real=buildIncidentNotification({monitor,kind:'down',occurredAt,startedAt:occurredAt,incidentId:'12',result:{ok:false,httpStatus:503,latencyMs:240,error:'HTTP 503'},dashboardUrl:'https://uptime.example.com/'});
  const test=samples[0];
  assert.equal(test.title.replace('[TEST] ',''),real.title);
  assert.equal(test.message,real.message);
  assert.equal(real.isTest,false);
  assert.match(real.title,/^🔴 DOWN/);
  assert.equal(real.message,'HTTP 503 — Service unavailable.');
  assert.deepEqual(notificationFields(real).map(f=>f.name),['URL','Time']);
  const email=renderEmail(real);
  assert.ok(email.html.includes('FACT &lt;PROD&gt;'));
  assert.equal(email.html.includes('<script>'),false);
  assert.match(email.text,/URL: https:\/\/example.com/);
  assert.match(email.html,/View dashboard/);
});

const payload={title:'Local verification',message:'Fixture alert; no production outage.',monitorName:'Fixture',url:'https://example.com/',kind:'test' as const,occurredAt:new Date().toISOString()};
type CapturedEmbed={title:string;description:string;color:number;fields:{name:string;value:string}[];footer:{text:string};url:string};
test('Discord waits for acceptance and disables mentions',async()=>{
  let received:{path?:string;body?:Record<string,unknown>}={};
  const server=createServer(async(req,res)=>{
    let body='';for await(const chunk of req) body+=chunk;
    received={path:req.url,body:JSON.parse(body)};
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({id:'fixture-message'}));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const port=(server.address() as {port:number}).port;
    const id=await sendDiscord(payload,`http://127.0.0.1:${port}/webhook`,true);
    assert.equal(id,'fixture-message');assert.equal(received.path,'/webhook?wait=true');
    assert.deepEqual(received.body?.allowed_mentions,{parse:[]});
    for(const sample of buildTestNotifications({name:'FACT PROD',url:'https://example.com/',project:'FACT'},'all','2026-09-05T16:00:00.000Z','https://uptime.example.com/')){
      await sendDiscord(sample,`http://127.0.0.1:${port}/webhook`,true);
      const embed:CapturedEmbed=(received.body?.embeds as CapturedEmbed[])[0];
      assert.equal(embed.title,sample.title);assert.equal(embed.description,sample.message);
      assert.deepEqual(embed.fields.map(({name,value})=>({name,value})),notificationFields(sample));
      assert.equal(embed.color,sample.kind==='down'?0xb3293e:0x17734d);
      assert.equal(embed.footer.text,'Test notification');
      assert.equal(embed.url,'https://uptime.example.com/');
    }
  }finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('Discord rate limit preserves provider retry timing without exposing webhook',async()=>{
  const server=createServer((_req,res)=>{res.writeHead(429,{'Content-Type':'application/json'});res.end('{"retry_after":2.5}');});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const port=(server.address() as {port:number}).port;
    await assert.rejects(sendDiscord(payload,`http://127.0.0.1:${port}/secret`,true),(error:Error&{retryAfterMs?:number})=>error.retryAfterMs===2500&&!error.message.includes('secret'));
  }finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('email reaches a local SMTP receiver with actual subject and recipient',async()=>{
  let message='';let recipients:string[]=[];
  const server=new SMTPServer({authOptional:true,disabledCommands:['STARTTLS'],onData(stream,session,callback){
    recipients=session.envelope.rcptTo.map(r=>r.address);
    stream.on('data',chunk=>message+=chunk.toString());stream.on('end',()=>callback());
  }});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const port=(server.server.address() as {port:number}).port;
    await sendEmail(payload,{host:'127.0.0.1',port,secure:false,user:'',password:'',from:'uptime@localhost.test',to:['owner@localhost.test']},true);
    assert.deepEqual(recipients,['owner@localhost.test']);assert.match(message,/Subject: Local verification/);
    assert.match(message,/Fixture alert/);
  }finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
