import { getDashboard } from '@/lib/dashboard';
export const dynamic='force-dynamic';
export async function GET(){
  try{return Response.json(await getDashboard(),{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:'PostgreSQL is unavailable. Check the database connection and refresh.'},{status:503});}
}
