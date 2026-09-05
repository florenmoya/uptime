import { control,InputError } from '@/lib/control';
export async function POST(request:Request){
  try{
    if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Send a JSON request.'},{status:415});
    const raw=await request.text();
    if(raw.length>6000)return Response.json({error:'Request is too large.'},{status:413});
    let body:unknown;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
    if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'Invalid request.'},{status:400});
    return Response.json({message:await control(body as Record<string,unknown>)});
  }catch(error){
    return Response.json({error:error instanceof InputError?error.message:'The change could not be saved. Check the database and retry.'},{status:error instanceof InputError?400:503});
  }
}
