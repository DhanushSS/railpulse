import { authorize } from '../../../lib/auth';
import { ObjectId } from 'mongodb';
import { notesCollection, type ServiceNote } from '../../../lib/mongo';
import { pool } from '../../../lib/db';
export const dynamic='force-dynamic';
const categories=['DELAY_REVIEW','SERVICE','OTHER'] as const;
const numberPattern=/^[0-9]{4,6}$/;
function local(request:Request){const url=new URL(request.url);return ['localhost','127.0.0.1'].includes(url.hostname)&&request.headers.get('origin')===url.origin;}
export async function GET(request:Request){
 const denied=await authorize();if(denied)return denied;
 const url=new URL(request.url),train=url.searchParams.get('train')||'',category=url.searchParams.get('category')||'';
 if(train&&!numberPattern.test(train)||category&&!categories.includes(category as typeof categories[number]))return Response.json({error:'Invalid note filters.'},{status:400});
 try{const c=await notesCollection();const docs=await c.find({deleted_at:{$exists:url.searchParams.get('trash')==='true'},...(train?{train_number:train}:{}),...(category?{category:category as ServiceNote['category']}:{})}).sort({created_at:-1,_id:-1}).limit(50).toArray();return Response.json({notes:docs.map(({_id,...note})=>({id:_id.toString(),...note}))},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Service Notes database unavailable. Start MongoDB and try again.'},{status:503});}
}
async function write(request:Request,edit:boolean){
 const denied=await authorize();if(denied)return denied;
 if(!local(request))return Response.json({error:'Local access required.'},{status:403});
 let body;try{body=await request.json();}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
 if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'Invalid note.'},{status:400});
 if(edit&&body.action==='restore'){
  if(typeof body.id!=='string'||!/^[a-f0-9]{24}$/i.test(body.id))return Response.json({error:'Invalid note ID.'},{status:400});
  try{const c=await notesCollection();const r=await c.updateOne({_id:new ObjectId(body.id),deleted_at:{$exists:true}},{$unset:{deleted_at:''},$set:{updated_at:new Date()}});return r.matchedCount?Response.json({ok:true}):Response.json({error:'No note found in trash.'},{status:404});}catch{return Response.json({error:'Could not restore note.'},{status:503});}
 }
 const train=typeof body.train_number==='string'?body.train_number.trim():'',station=typeof body.station_code==='string'?body.station_code.trim().toUpperCase():'',category=typeof body.category==='string'?body.category:'',note=typeof body.note==='string'?body.note.trim():'',tags=Array.isArray(body.tags)?body.tags:[];
 if(edit&&(typeof body.id!=='string'||!/^[a-f0-9]{24}$/i.test(body.id)))return Response.json({error:'Invalid note ID.'},{status:400});
 if(!numberPattern.test(train)||(station&&!/^[A-Z0-9]{1,10}$/.test(station))||!categories.includes(category as typeof categories[number])||note.length<10||note.length>1000||tags.length>5||tags.some((t:unknown)=>typeof t!=='string'||!/^[a-z0-9 -]{1,24}$/.test(t)))return Response.json({error:'Check train, category, station code, tags and observation length (10–1,000 characters).'},{status:400});
 try{
  if(!(await pool.query('SELECT 1 FROM train WHERE train_number=$1',[train])).rowCount)return Response.json({error:'That train is not in RailPulse.'},{status:400});
  if(station&&!(await pool.query('SELECT 1 FROM station WHERE station_code=$1',[station])).rowCount)return Response.json({error:'That station code is not in RailPulse.'},{status:400});
  const c=await notesCollection();const fields={train_number:train,category:category as ServiceNote['category'],note,tags:[...new Set<string>(tags)]};
  if(edit){const update=await c.updateOne({_id:new ObjectId(body.id),deleted_at:{$exists:false}},{$set:{...fields,...(station?{station_code:station}:{}),updated_at:new Date()},...(!station?{$unset:{station_code:''}}:{})});if(!update.matchedCount)return Response.json({error:'This note no longer exists.'},{status:404});return Response.json({id:body.id});}
  const result=await c.insertOne({...fields,...(station?{station_code:station}:{}),source:'user_entry',created_at:new Date()});return Response.json({id:result.insertedId.toString()},{status:201});
 }catch{return Response.json({error:'Could not save the note. Check PostgreSQL and MongoDB, then retry.'},{status:503});}
}
export async function POST(request:Request){return write(request,false);}
export async function PATCH(request:Request){return write(request,true);}
export async function DELETE(request:Request){
 const denied=await authorize();if(denied)return denied;
 if(!local(request))return Response.json({error:'Local access required.'},{status:403});
 let body;try{body=await request.json();}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
 if(!body||typeof body.id!=='string'||!/^[a-f0-9]{24}$/i.test(body.id))return Response.json({error:'Invalid note ID.'},{status:400});
 try{const c=await notesCollection();const result=await c.updateOne({_id:new ObjectId(body.id),deleted_at:{$exists:false}},{$set:{deleted_at:new Date()}});if(!result.matchedCount)return Response.json({error:'This note no longer exists.'},{status:404});return Response.json({ok:true});}catch{return Response.json({error:'Could not move the note to trash.'},{status:503});}
}
