import { authorize } from '../../../lib/auth';
import { pool } from '../../../lib/db';
import { notesCollection } from '../../../lib/mongo';
export const dynamic='force-dynamic';
const tables=['zone','station','train','route_stop','journey','stop_event','alert','user_account','complaint','auth_session'];
const views=['vw_train_reliability','vw_station_delay_summary'];
export async function GET(request:Request){
 const denied=await authorize();if(denied)return denied;
 const url=new URL(request.url),table=url.searchParams.get('table'),page=Number(url.searchParams.get('page')||'1');
 if(!Number.isSafeInteger(page)||page<1||page>100000)return Response.json({error:'Invalid page.'},{status:400});
 try{
  if(!table){
   const [cols,constraints,counts]=await Promise.all([
    pool.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position"),
    pool.query("SELECT cl.relname table_name,co.conname name,co.contype type,pg_get_constraintdef(co.oid) definition FROM pg_constraint co JOIN pg_class cl ON cl.oid=co.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' ORDER BY cl.relname,co.conname"),
    Promise.all([...tables,...views].map(async name=>({name,kind:views.includes(name)?'view':'table',count:Number((await pool.query(`SELECT count(*) FROM "${name}"`)).rows[0].count)})))
   ]);
   let mongo:{connected:boolean;count:number;error?:string};try{const c=await notesCollection();mongo={connected:true,count:await c.countDocuments()};}catch{mongo={connected:false,count:0,error:'MongoDB is unavailable.'};}
   return Response.json({tables:counts.map(t=>({...t,columns:cols.rows.filter(c=>c.table_name===t.name),constraints:constraints.rows.filter(c=>c.table_name===t.name)})),mongo,database:(await pool.query('SELECT current_database() name')).rows[0].name},{headers:{'Cache-Control':'no-store'}});
  }
  if(table==='service_notes'){
   const c=await notesCollection();const docs=await c.find({}).sort({created_at:-1,_id:-1}).skip((page-1)*25).limit(25).toArray();
   return Response.json({rows:docs.map(({_id,...doc})=>({_id:_id.toString(),...doc})),count:await c.countDocuments(),query:'db.service_notes.find({}).sort({created_at: -1, _id: -1}).skip('+((page-1)*25)+').limit(25)',columns:['_id','train_number','station_code','category','note','tags','source','created_at','updated_at','deleted_at','details']});
  }
  if(![...tables,...views].includes(table))return Response.json({error:'Unknown project table.'},{status:400});
  const cols=(await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows;
  const names=cols.map(c=>c.column_name as string);
  const projections=cols.map(col=>{const c=col.column_name;return ['password_hash','token_hash'].includes(c)?`'[protected]'::text AS "${c}"`:['date','timestamp without time zone','timestamp with time zone'].includes(col.data_type)?`"${c}"::text AS "${c}"`:`"${c}"`;});
  const query=`SELECT ${projections.join(', ')} FROM "${table}" ORDER BY 1, 2 LIMIT 25 OFFSET ${(page-1)*25};`;
  const [rows,count]=await Promise.all([pool.query(query),pool.query(`SELECT count(*) FROM "${table}"`)]);
  return Response.json({rows:rows.rows,count:Number(count.rows[0].count),query,columns:names},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not read the database. Check that PostgreSQL and MongoDB are running.'},{status:503});}
}
