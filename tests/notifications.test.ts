import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { SMTPServer } from 'smtp-server';
import { sendDiscord,sendEmail } from '../src/lib/notifications.js';
import {buildIncidentNotification,buildTestNotifications,renderEmail,notificationFields,TEST_SCENARIOS} from '../src/lib/notification-content.js';

test('incident samples use the real templates, distinguish every supported scenario and escape email HTML',()=>{
  const monitor={name:'FACT <PROD>',url:'https://example.com/?q=<script>',project:'FACT',interval_seconds:60};
  const occurredAt='2026-09-05T16:00:00.000Z';
  const samples=buildTestNotifications(monitor,'all',occurredAt,'https://uptime.example.com/');
  assert.equal(samples.length,TEST_SCENARIOS.length);
  assert.equal(new Set(samples.map(p=>p.message)).size,samples.length);
  for(const sample of samples){assert.equal(sample.isTest,true);assert.match(sample.title,/^\[TEST\]/);assert.equal(sample.url,monitor.url);assert.ok(notificationFields(sample).some(f=>f.name==='Time'&&f.value.includes('PHT')));}
  const recovery=samples.find(p=>p.kind==='recovered')!;
  assert.ok(notificationFields(recovery).some(f=>f.name==='Incident duration'&&f.value==='5m 0s'));
  const real=buildIncidentNotification({monitor,kind:'down',occurredAt,startedAt:occurredAt,incidentId:'12',result:{ok:false,httpStatus:503,latencyMs:240,error:'HTTP 503'},dashboardUrl:'https://uptime.example.com/'});
  const test=samples[0];
  assert.equal(test.title.replace('[TEST] ',''),real.title);
  assert.equal(test.message,real.message);
  assert.equal(real.isTest,false);
  const email=renderEmail(real);
  assert.ok(email.html.includes('FACT &lt;PROD&gt;'));
  assert.equal(email.html.includes('<script>'),false);
  assert.match(email.text,/Incident: #12/);
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
      assert.match(embed.footer.text,/no incident was created/);
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
    await sendEmail(payload,{host:'127.0.0.1',port,secure:false,user:'',password:'',from:'uptime@localhost.test',to:['owner@localhost.test']});
    assert.deepEqual(recipients,['owner@localhost.test']);assert.match(message,/Subject: Local verification/);
    assert.match(message,/Fixture alert/);
  }finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
