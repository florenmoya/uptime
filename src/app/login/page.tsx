import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {isSessionValid,SESSION_COOKIE} from '@/lib/auth';
import LoginForm from '@/components/login-form';
export const dynamic='force-dynamic';
export const metadata={title:'Sign in · Bayanko Uptime'};
export default async function LoginPage(){
  let signedIn=false;
  try{signedIn=await isSessionValid((await cookies()).get(SESSION_COOKIE)?.value);}catch{}
  if(signedIn)redirect('/');
  return <LoginForm/>;
}
