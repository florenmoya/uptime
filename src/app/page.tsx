import { getDashboard } from '@/lib/dashboard';
import Dashboard from '@/components/dashboard';
export const dynamic='force-dynamic';
export default async function Page(){
  try{return <Dashboard initial={await getDashboard()}/>;}
  catch{return <main className="unavailable"><h1>Unable to load your monitors</h1><p>PostgreSQL is unavailable. Start your database, verify DATABASE_URL, and run npm run db:setup.</p><a href="/">Try again</a></main>;}
}
