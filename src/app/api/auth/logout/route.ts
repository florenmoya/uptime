import {NextRequest,NextResponse} from 'next/server';
import {revokeSession,SESSION_COOKIE,sessionCookieOptions} from '@/lib/auth';
export async function POST(request:NextRequest){
  try{
    await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
    const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set(SESSION_COOKIE,'',{...sessionCookieOptions(),maxAge:0});
    return response;
  }catch{return NextResponse.json({error:'Unable to sign out. Please try again.'},{status:503});}
}
