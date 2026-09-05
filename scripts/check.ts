import { pool } from '../src/lib/db';
import { runDueChecks } from '../src/lib/monitoring';
const lock=await pool.connect();
try {
  const result=await lock.query('SELECT pg_try_advisory_lock(92746108) AS acquired');
  if(!result.rows[0].acquired)throw new Error('Stop the worker before running a one-shot check.');
  await pool.query('UPDATE monitors SET next_check_at=now() WHERE enabled AND url IS NOT NULL');
  console.log(`Checked ${await runDueChecks()} configured monitors.`);
}finally{await lock.query('SELECT pg_advisory_unlock(92746108)').catch(()=>{});lock.release();await pool.end();}
