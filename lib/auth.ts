import { cookies } from 'next/headers';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db';
const derive=promisify(scrypt);
const cookieName='railpulse_session';
export type User={user_id:number;full_name:string;email:string;role:string};
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64) as Buffer;return `scrypt$${salt}$${key.toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){const [algorithm,salt,encoded]=stored.split('$');if(algorithm!=='scrypt'||!salt||!encoded)return false;const key=await derive(password,salt,64) as Buffer;const expected=Buffer.from(encoded,'hex');return expected.length===key.length&&timingSafeEqual(key,expected);}
export async function currentUser():Promise<User|null>{const token=(await cookies()).get(cookieName)?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const r=await pool.query<User>('SELECT u.user_id,u.full_name,u.email,u.role FROM auth_session s JOIN user_account u USING(user_id) WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)]);return r.rows[0]||null;}
export async function beginSession(userId:number,secure:boolean){const token=randomBytes(32).toString('hex');await pool.query("INSERT INTO auth_session(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digest(token),userId]);(await cookies()).set(cookieName,token,{httpOnly:true,sameSite:'lax',secure,path:'/',maxAge:8*60*60});}
export async function endSession(){const store=await cookies();const token=store.get(cookieName)?.value;if(token)await pool.query('DELETE FROM auth_session WHERE token_hash=$1',[digest(token)]);store.set(cookieName,'',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});}
export async function authorize(){try{return await currentUser()?null:Response.json({error:'Please sign in to RailPulse.'},{status:401});}catch{return Response.json({error:'The account database is unavailable.'},{status:503});}}
