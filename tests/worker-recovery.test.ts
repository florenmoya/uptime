import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

test('supervised worker reacquires its lock and resumes after its database connection is lost',async()=>{
  const database=`uptime_test_${randomBytes(5).toString('hex')}`;
  const url=new URL(process.env.TEST_DATABASE_URL??'postgresql://postgres@localhost:5432/postgres');
  url.pathname='/postgres';
  const admin=new pg.Client({connectionString:url.toString()});await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  url.pathname=`/${database}`;
  const fixture=new pg.Client({connectionString:url.toString()});await fixture.connect();
  await fixture.query(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
  const worker=spawn(process.execPath,['scripts/worker.mjs'],{windowsHide:true,stdio:'pipe',env:{...process.env,DATABASE_URL:url.toString()}});
  let output='';worker.stderr.on('data',chunk=>output+=chunk);
  async function leader(except=0){
    for(let i=0;i<100;i++){
      const found=await admin.query("SELECT a.pid FROM pg_stat_activity a JOIN pg_locks l ON l.pid=a.pid WHERE a.datname=$1 AND l.locktype='advisory' AND l.granted AND a.pid<>$2",[database,except]);
      if(found.rowCount)return found.rows[0].pid as number;
      if(worker.exitCode!==null)throw Error(`Worker exited: ${output}`);
      await delay(100);
    }
    throw Error(`Worker did not recover: ${output}`);
  }
  try{
    const first=await leader();
    await admin.query('SELECT pg_terminate_backend($1)',[first]);
    const second=await leader(first);assert.notEqual(second,first);
    for(let i=0;i<30;i++){
      const health=await fixture.query("SELECT heartbeat_at>now()-interval '2 seconds' AS healthy FROM worker_health");
      if(health.rows[0]?.healthy)return;
      await delay(100);
    }
    assert.fail('Worker did not resume its heartbeat');
  }finally{
    worker.kill('SIGTERM');
    await new Promise<void>(resolve=>worker.exitCode!==null?resolve():worker.once('exit',()=>resolve()));
    await fixture.end();
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);await admin.end();
  }
});
