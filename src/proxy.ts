import { NextRequest,NextResponse } from 'next/server';
import { isPublicPath,permittedRequest } from './lib/request-guard';
import { isSessionValid,SESSION_COOKIE } from './lib/auth';

export async function proxy(request:NextRequest) {
  if(!permittedRequest(request.headers.get('host'),request.headers.get('origin'),request.method,process.env.APP_URL))return new NextResponse('Open this dashboard directly to access it or make changes.',{status:403});
  if(isPublicPath(request.nextUrl.pathname)&&['GET','HEAD'].includes(request.method))return NextResponse.next();
  const path=request.nextUrl.pathname;
  if(path==='/login'||path==='/api/auth/login'||path==='/api/auth/logout')return NextResponse.next();
  try{
    if(await isSessionValid(request.cookies.get(SESSION_COOKIE)?.value))return NextResponse.next();
  }catch{
    return new NextResponse('Sign-in is temporarily unavailable. Please try again.',{status:503});
  }
  if(path.startsWith('/api/'))return NextResponse.json({error:'Please sign in to continue.'},{status:401});
  return NextResponse.redirect(new URL('/login',request.url));
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
