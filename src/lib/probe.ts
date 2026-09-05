import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

export type ProbeResult={ok:boolean;httpStatus:number|null;latencyMs:number;error:string|null};
export function isPublicAddress(address:string):boolean {
  try {return ipaddr.process(address).range()==='unicast';} catch {return false;}
}
export function validateTarget(value:string):string {
  const url=new URL(value);
  if (!['https:','http:'].includes(url.protocol)||url.username||url.password) throw new Error('Use an HTTP or HTTPS URL without embedded credentials.');
  if (url.port&&!['80','443'].includes(url.port)) throw new Error('Use standard HTTP or HTTPS ports (80 or 443).');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if (host==='localhost'||(isIP(host)&&!isPublicAddress(host))) throw new Error('The target must use a public internet address.');
  url.hash='';
  return url.toString();
}

export async function probe(target:string,options:{timeoutMs?:number;allowPrivateForTest?:boolean}={}):Promise<ProbeResult> {
  const start=performance.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs??10000);
  try {
    let url=new URL(target);
    for(let redirects=0;redirects<=5;redirects++) {
      if (!options.allowPrivateForTest) validateTarget(url.toString());
      const hostname=url.hostname.replace(/^\[|\]$/g,'');
      const addresses=isIP(hostname)?[{address:hostname,family:isIP(hostname)}]:await new Promise<{address:string;family:number}[]>((resolve,reject)=>{
        const abort=()=>reject(new Error('Check timed out.'));
        if(controller.signal.aborted){abort();return;}
        controller.signal.addEventListener('abort',abort,{once:true});
        lookup(hostname,{all:true}).then(value=>{controller.signal.removeEventListener('abort',abort);resolve(value);},error=>{controller.signal.removeEventListener('abort',abort);reject(error);});
      });
      if (!addresses.length||(!options.allowPrivateForTest&&addresses.some(a=>!isPublicAddress(a.address)))) throw new Error('The target must resolve to a public internet address.');
      if(controller.signal.aborted) throw new Error('Check timed out.');
      const address=addresses.find(a=>a.family===4)??addresses[0];
      const response=await new Promise<{status:number;location?:string}>((resolve,reject)=>{
        const request=(url.protocol==='https:'?https:http).request(url,{
          method:'GET',signal:controller.signal,agent:false,
          headers:{'User-Agent':'BayankoUptime/1.0','Accept':'*/*'},
          lookup:(_hostname,lookupOptions,callback)=>{
            if(lookupOptions.all) callback(null,[address]);
            else callback(null,address.address,address.family);
          },
        },res=>{
          resolve({status:res.statusCode??0,location:res.headers.location});
          res.destroy();
        });
        request.on('error',reject);request.end();
      });
      if ([301,302,303,307,308].includes(response.status)&&response.location) {
        if (redirects===5) throw new Error('Too many redirects.');
        url=new URL(response.location,url);continue;
      }
      return {ok:response.status>=200&&response.status<400,httpStatus:response.status,latencyMs:Math.round(performance.now()-start),error:response.status>=200&&response.status<400?null:`HTTP ${response.status}`};
    }
    throw new Error('Too many redirects.');
  }catch(error) {
    const code=(error as NodeJS.ErrnoException).code;
    const known:Record<string,string>={ENOTFOUND:'DNS name not found.',EAI_AGAIN:'DNS lookup temporarily failed.',ECONNREFUSED:'Connection refused.',ECONNRESET:'Connection reset.',CERT_HAS_EXPIRED:'TLS certificate expired.',UNABLE_TO_VERIFY_LEAF_SIGNATURE:'TLS certificate could not be verified.',ERR_TLS_CERT_ALTNAME_INVALID:'TLS certificate hostname mismatch.'};
    const message=controller.signal.aborted?'Check timed out.':known[code??'']??(error instanceof Error?error.message:'Check failed.');
    return {ok:false,httpStatus:null,latencyMs:Math.round(performance.now()-start),error:message.slice(0,200)};
  }finally {clearTimeout(timer);}
}
