import { currentUser } from '../../../lib/auth';
import { pool } from '../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){
 try{const user=await currentUser();if(!user)return Response.json({error:'Please sign in.'},{status:401});
 const r=await pool.query(`SELECT c.complaint_id,c.train_id,t.train_number,t.train_name,c.journey_id,c.complaint_text,c.category,c.created_at::text,c.user_id,u.full_name FROM complaint c JOIN train t USING(train_id) JOIN user_account u USING(user_id) WHERE ($1::boolean OR c.user_id=$2) ORDER BY c.complaint_id DESC`,[user.role==='ADMIN',user.user_id]);return Response.json({rows:r.rows,scope:user.role==='ADMIN'?'All feedback':'My feedback'});
 }catch{return Response.json({error:'Feedback database unavailable.'},{status:503});}
}
async function write(request:Request,method:string){
 try{const user=await currentUser();if(!user)return Response.json({error:'Please sign in.'},{status:401});
 const url=new URL(request.url);if(!['localhost','127.0.0.1'].includes(url.hostname)||request.headers.get('origin')!==url.origin)return Response.json({error:'Local access required.'},{status:403});
 const b=await request.json();if(!b||typeof b!=='object'||Array.isArray(b))return Response.json({error:'Invalid feedback.'},{status:400});
 if(method!=='POST'&&(!Number.isSafeInteger(b.id)||b.id<1))return Response.json({error:'Invalid feedback ID.'},{status:400});
 if(method!=='DELETE'&&(!Number.isSafeInteger(b.train_id)||b.train_id<1||typeof b.text!=='string'||b.text.trim().length<10||b.text.length>2000||!['DELAY','CLEANLINESS','SAFETY','STAFF','CATERING','OTHER'].includes(b.category)||(b.journey_id!=null&&(!Number.isSafeInteger(b.journey_id)||b.journey_id<1))))return Response.json({error:'Choose a train, category and feedback of 10-2,000 characters.'},{status:400});
 const client=await pool.connect();try{await client.query('BEGIN');
 let r;
 if(method==='POST')r=await client.query('INSERT INTO complaint(user_id,train_id,journey_id,complaint_text,category) VALUES($1,$2,$3,$4,$5) RETURNING complaint_id',[user.user_id,b.train_id,b.journey_id??null,b.text.trim(),b.category]);
 else if(method==='PATCH')r=await client.query('UPDATE complaint SET train_id=$1,journey_id=$2,complaint_text=$3,category=$4 WHERE complaint_id=$5 AND (user_id=$6 OR $7::boolean) RETURNING complaint_id',[b.train_id,b.journey_id??null,b.text.trim(),b.category,b.id,user.user_id,user.role==='ADMIN']);
 else r=await client.query('DELETE FROM complaint WHERE complaint_id=$1 AND (user_id=$2 OR $3::boolean) RETURNING complaint_id',[b.id,user.user_id,user.role==='ADMIN']);
 if(!r.rowCount){await client.query('ROLLBACK');return Response.json({error:'Feedback not found or not permitted.'},{status:404});}
 await client.query('COMMIT');return Response.json({id:r.rows[0].complaint_id},{status:method==='POST'?201:200});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){const code=(e as {code?:string}).code;if(e instanceof SyntaxError||['23503','23514','23502'].includes(code||''))return Response.json({error:'Invalid train/journey relationship or feedback fields.'},{status:400});return Response.json({error:'Could not save feedback.'},{status:503});}
}
export async function POST(r:Request){return write(r,'POST');}
export async function PATCH(r:Request){return write(r,'PATCH');}
export async function DELETE(r:Request){return write(r,'DELETE');}
