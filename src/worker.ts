import { setTimeout as delay } from 'node:timers/promises';
import { pool } from './lib/db';
import { runDueChecks,cleanupHistory } from './lib/monitoring';
import { dispatchPending } from './lib/notifications';
import {refreshOverview} from './lib/discord-overview';

const leader=await pool.connect();
leader.on('error',()=>{console.error('Worker lock connection lost. Exiting so the supervisor can restart safely.');process.exit(1);});
const lock=await leader.query('SELECT pg_try_advisory_lock(92746108) AS acquired');
if(!lock.rows[0].acquired){leader.release();await pool.end();console.error('Another uptime worker already holds the scheduler lock.');process.exit(2);}
let stopping=false;let cleanupAt=0;
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{stopping=true;});
console.log('Uptime worker started. Checks run independently of the dashboard.');
try {
  while(!stopping){
    try {
      await pool.query('INSERT INTO worker_health(id,heartbeat_at) VALUES(true,now()) ON CONFLICT(id) DO UPDATE SET heartbeat_at=now()');
      await Promise.all([runDueChecks(),dispatchPending()]);
      await refreshOverview();
      if(Date.now()>cleanupAt){await cleanupHistory();cleanupAt=Date.now()+3600000;}
    }catch{console.error('Worker cycle failed. Database health will be retried; missing checks remain unknown.');}
    await delay(1000);
  }
}finally{
  await leader.query('SELECT pg_advisory_unlock(92746108)').catch(()=>{});leader.release();await pool.end();
}
