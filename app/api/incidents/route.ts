import {currentUser} from '../../../lib/auth';
import {incidentCollection} from '../../../lib/mongo';
import {pool} from '../../../lib/db';
import {ObjectId} from 'mongodb';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const user=await currentUser();if(!user)return Response.json({error:'Please sign in.'},{status:401});
 const u=new URL(request.url),q=u.searchParams.get('q')||'',status=u.searchParams.get('status')||'';
 if(q.length>100||status&&!['OPEN','INVESTIGATING','RESOLVED'].includes(status))return Response.json({error:'Invalid filter.'},{status:400});
 const c=await incidentCollection();const filter={...(status?{status}:{}),...(q?{$text:{$search:q}}:{})};
 const result=await c.aggregate([{$match:filter},{$facet:{records:[{$sort:{updated_at:-1,_id:-1}},{$limit:50}],statusSummary:[{$group:{_id:'$status',count:{$sum:1}}},{$sort:{_id:1}}],trainSummary:[{$group:{_id:'$train_number',cases:{$sum:1},updates:{$sum:{$size:'$updates'}}}},{$sort:{cases:-1,_id:1}}],totals:[{$count:'count'}]}}]).toArray();
 return Response.json(result[0],{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Incident database unavailable. Run setup:incidents.'},{status:503});}}
export async function POST(request:Request){return write(request,false);}
export async function PATCH(request:Request){return write(request,true);}
async function write(request:Request,edit:boolean){try{
 const user=await currentUser();if(!user)return Response.json({error:'Please sign in.'},{status:401});const url=new URL(request.url);if(!['localhost','127.0.0.1'].includes(url.hostname)||request.headers.get('origin')!==url.origin)return Response.json({error:'Local access required.'},{status:403});
 const b=await request.json();if(!b||typeof b!=='object'||Array.isArray(b))return Response.json({error:'Invalid request.'},{status:400});const c=await incidentCollection();
 if(edit){if(typeof b.id!=='string'||!/^[a-f0-9]{24}$/i.test(b.id)||typeof b.update!=='string'||b.update.trim().length<10||b.update.length>1000)return Response.json({error:'Provide an update of 10-1,000 characters.'},{status:400});
 if(b.status&&(!['OPEN','INVESTIGATING','RESOLVED'].includes(b.status)||user.role!=='ADMIN'))return Response.json({error:'Only an administrator can change case status.'},{status:403});
 const r=await c.updateOne({_id:new ObjectId(b.id),'updates.99':{$exists:false},...(user.role==='ADMIN'?{}:{status:{$ne:'RESOLVED'}})},{$set:{updated_at:new Date(),...(b.status?{status:b.status}:{})},$push:{updates:{text:b.update.trim(),author:user.full_name,user_id:user.user_id,at:new Date(),...(b.status?{status:b.status}:{})}}});
 if(!r.matchedCount && user.role!=='ADMIN' && await c.findOne({_id:new ObjectId(b.id),status:'RESOLVED'},{projection:{_id:1}})){
   return Response.json({error:'This investigation is resolved. Analyst updates are closed.'},{status:409});
 }
 return r.matchedCount?Response.json({ok:true}):Response.json({error:'Case missing or its 100-update limit was reached.'},{status:404});}
 if(typeof b.train_number!=='string'||typeof b.title!=='string'||b.title.trim().length<5||b.title.length>120||!['LOW','MEDIUM','HIGH'].includes(b.priority)||typeof b.description!=='string'||b.description.trim().length<10||b.description.length>2000)return Response.json({error:'Check train, title, priority and description.'},{status:400});
 if(!(await pool.query('SELECT 1 FROM train WHERE train_number=$1',[b.train_number])).rowCount)return Response.json({error:'Train is not in the project.'},{status:400});
 const now=new Date();const r=await c.insertOne({train_number:b.train_number,title:b.title.trim(),description:b.description.trim(),priority:b.priority,status:'OPEN',source:'user_entry',created_by:user.user_id,created_at:now,updated_at:now,updates:[]});return Response.json({id:r.insertedId},{status:201});
 }catch(e){if(e instanceof SyntaxError)return Response.json({error:'Invalid JSON.'},{status:400});return Response.json({error:'Could not save the review.'},{status:503});}}
