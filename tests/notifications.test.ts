import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { SMTPServer } from 'smtp-server';
import { sendDiscord,sendEmail } from '../src/lib/notifications.js';

const payload={title:'Local verification',message:'Fixture alert; no production outage.',monitorName:'Fixture',url:'https://example.com/',kind:'test' as const,occurredAt:new Date().toISOString()};
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
