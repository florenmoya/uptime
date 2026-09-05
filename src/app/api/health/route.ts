import { pool } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const worker=await pool.query("SELECT heartbeat_at>now()-interval '90 seconds' AS healthy FROM worker_health WHERE id=true");
    const healthy=Boolean(worker.rows[0]?.healthy);
    return Response.json({database:'connected',worker:healthy?'running':'stale'},{status:healthy?200:503,headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({database:'unavailable',worker:'unknown'},{status:503});}
}
