

export function isPublicPath(pathname:string):boolean {
  return pathname==='/api/health'||pathname==='/icon.svg'||/^\/status\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(pathname);
}

export function permittedRequest(host:string|null,origin:string|null,method:string,appUrl='http://127.0.0.1:3100'):boolean {
  try {
    const app=new URL(appUrl);
    const allowedHosts=new Set(['127.0.0.1:3100','localhost:3100',app.host]);
    if(!host||!allowedHosts.has(host))return false;
    if(['GET','HEAD','OPTIONS'].includes(method))return true;
    if(!origin)return false;
    const allowedOrigins=new Set(['http://127.0.0.1:3100','http://localhost:3100',app.origin]);
    return allowedOrigins.has(new URL(origin).origin);
  }catch{return false;}
}
