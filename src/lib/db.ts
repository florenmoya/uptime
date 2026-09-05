import pg from 'pg';
import { settings } from './config';
const globalDb=globalThis as unknown as {uptimePool?:pg.Pool};
export const pool=globalDb.uptimePool ?? new pg.Pool({connectionString:settings().databaseUrl,max:6,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:10000});
globalDb.uptimePool=pool;
pool.on('error',()=>console.error('PostgreSQL connection lost; the next operation will reconnect.'));
export async function transaction<T>(fn:(client:pg.PoolClient)=>Promise<T>):Promise<T> {
  const client=await pool.connect();
  let connectionError:Error|undefined;
  const onError=(error:Error)=>{connectionError=error;};
  client.on('error',onError);
  try { await client.query('BEGIN'); const result=await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
  finally {client.release(connectionError);client.removeListener('error',onError);}
}
