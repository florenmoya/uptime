import {NextResponse} from 'next/server';
import {allowLoginAttempt,authConfigured,createAdminSession,credentialsMatch,SESSION_COOKIE,sessionCookieOptions} from '@/lib/auth';

export async function POST(request:Request){
  if(!authConfigured())return NextResponse.json({error:'Sign-in is not configured. Contact the administrator.'},{status:503});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Invalid sign-in request.'},{status:415});
  try{
    const raw=await request.text();
    if(raw.length>4096)return NextResponse.json({error:'Invalid sign-in request.'},{status:413});
    let input;try{input=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid sign-in request.'},{status:400});}
    if(!await allowLoginAttempt())return NextResponse.json({error:'Too many sign-in attempts. Wait one minute and try again.'},{status:429,headers:{'Retry-After':'60'}});
    if(!input||!credentialsMatch(input.email,input.password))return NextResponse.json({error:'Email or password is incorrect.'},{status:401});
    const token=await createAdminSession();
    const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set(SESSION_COOKIE,token,sessionCookieOptions());
    return response;
  }catch{return NextResponse.json({error:'Sign-in is temporarily unavailable. Please try again.'},{status:503});}
}
