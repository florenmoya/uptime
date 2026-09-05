import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {pool} from './db';

export const SESSION_COOKIE='uptime_session';
export const SESSION_SECONDS=8*60*60;
export function authConfigured(){return Boolean(process.env.ADMIN_USERNAME&&process.env.ADMIN_PASSWORD&&process.env.SESSION_SECRET);}
function hash(value:string){return createHash('sha256').update(value).digest('hex');}
function credentialVersion(){return createHmac('sha256',process.env.SESSION_SECRET??'').update(`${process.env.ADMIN_USERNAME}\0${process.env.ADMIN_PASSWORD}`).digest('hex');}
export function credentialsMatch(email:unknown,password:unknown){
  if(!authConfigured()||typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>1024)return false;
  const supplied=Buffer.from(hash(`${email.trim().toLowerCase()}\0${password}`),'hex');
  const expected=Buffer.from(hash(`${process.env.ADMIN_USERNAME?.trim().toLowerCase()}\0${process.env.ADMIN_PASSWORD}`),'hex');
  return timingSafeEqual(supplied,expected);
}
export async function allowLoginAttempt():Promise<boolean>{
  const result=await pool.query(`INSERT INTO login_attempts(id,attempts) VALUES(true,1)
    ON CONFLICT(id) DO UPDATE SET
      attempts=CASE WHEN login_attempts.window_started_at<now()-interval '1 minute' THEN 1 ELSE login_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_attempts.window_started_at<now()-interval '1 minute' THEN now() ELSE login_attempts.window_started_at END
    RETURNING attempts`);
  return result.rows[0].attempts<=10;
}
export async function createAdminSession():Promise<string>{
  if(!authConfigured())throw new Error('Admin sign-in is not configured.');
  const token=randomBytes(32).toString('hex');
  await pool.query('DELETE FROM admin_sessions WHERE expires_at<=now() OR credential_version<>$1',[credentialVersion()]);
  await pool.query("INSERT INTO admin_sessions(token_hash,credential_version,expires_at) VALUES($1,$2,now()+interval '8 hours')",[hash(token),credentialVersion()]);
  return token;
}
export async function isSessionValid(token:string|undefined):Promise<boolean>{
  if(!authConfigured()||!token||!/^[a-f0-9]{64}$/.test(token))return false;
  const result=await pool.query('SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND credential_version=$2 AND expires_at>now()',[hash(token),credentialVersion()]);
  return Boolean(result.rowCount);
}
export async function revokeSession(token:string|undefined){
  if(token&&/^[a-f0-9]{64}$/.test(token))await pool.query('DELETE FROM admin_sessions WHERE token_hash=$1',[hash(token)]);
}
export function sessionCookieOptions(){return {httpOnly:true,secure:process.env.APP_URL?.startsWith('https://')??false,sameSite:'lax' as const,path:'/',maxAge:SESSION_SECONDS};}
