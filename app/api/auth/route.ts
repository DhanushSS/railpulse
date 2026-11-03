import { beginSession,currentUser,endSession,hashPassword,verifyPassword } from '../../../lib/auth';
import { pool } from '../../../lib/db';
export const dynamic='force-dynamic';
const attempts=new Map<string,{count:number;reset:number}>();
export async function GET(){try{const user=await currentUser();return Response.json({user},{status:user?200:401,headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Account database unavailable.'},{status:503});}}
export async function POST(request:Request){
 const url=new URL(request.url);if(request.headers.get('origin')!==url.origin||!['localhost','127.0.0.1'].includes(url.hostname))return Response.json({error:'Local access required.'},{status:403});
 try{
  const body=await request.json();if(!body||typeof body!=='object')return Response.json({error:'Invalid request.'},{status:400});
  if(body.action==='logout'){await endSession();return Response.json({ok:true});}
  if(!['login','register'].includes(body.action))return Response.json({error:'Invalid action.'},{status:400});
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'',password=typeof body.password==='string'?body.password:'',name=typeof body.full_name==='string'?body.full_name.trim():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>120||password.length<10||password.length>128||(body.action==='register'&&(name.length<2||name.length>100)))return Response.json({error:'Use a valid email, a 10–128 character password and a name of 2–100 characters.'},{status:400});
  const now=Date.now();for(const [key,value] of attempts)if(value.reset<now)attempts.delete(key);const limit=attempts.get(email)||{count:0,reset:now+15*60*1000};limit.count++;attempts.set(email,limit);if(limit.count>10)return Response.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
  let id:number;
  if(body.action==='register'){
   const hash=await hashPassword(password);
   const r=await pool.query("INSERT INTO user_account(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING user_id",[name,email,hash,email===process.env.ADMIN_EMAIL?.trim().toLowerCase()?'ADMIN':'ANALYST']);
   if(!r.rowCount)return Response.json({error:'An account already exists for this email. Sign in instead.'},{status:409});id=r.rows[0].user_id;
  }else{
   const r=await pool.query('SELECT user_id,password_hash FROM user_account WHERE email=$1',[email]);
   const dummy='scrypt$00000000000000000000000000000000$'+'0'.repeat(128);
   const valid=await verifyPassword(password,r.rows[0]?.password_hash||dummy);
   if(!r.rowCount||!valid)return Response.json({error:'Email or password is incorrect.'},{status:401});id=r.rows[0].user_id;
  }
  await beginSession(id,url.protocol==='https:');attempts.delete(email);return Response.json({ok:true},{status:body.action==='register'?201:200});
 }catch(error){if(error instanceof SyntaxError)return Response.json({error:'Invalid JSON.'},{status:400});return Response.json({error:'Could not connect to the account database. Please retry.'},{status:503});}
}
