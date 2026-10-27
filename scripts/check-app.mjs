import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {MongoClient,ObjectId} from 'mongodb';
const base=process.env.APP_URL||'http://localhost:3100';
const email=`railpulse-qa-${randomBytes(5).toString('hex')}@example.invalid`;
const password=randomBytes(24).toString('base64url');
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
const mongo=new MongoClient(process.env.MONGODB_URI);await mongo.connect();
let cookie='',noteId,userId;let checks=0;
async function call(path,{method='GET',body,auth=true,origin=base}={}){const r=await fetch(base+path,{method,headers:{...(auth&&cookie?{Cookie:cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});let json;try{json=await r.json();}catch{json=null;}return {status:r.status,json,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
function status(result,want){assert.equal(result.status,want,JSON.stringify(result.json));checks++;}
try{
 for(const path of ['/api/dashboard','/api/database','/api/notes','/api/trains','/api/stations','/api/alerts'])status(await call(path,{auth:false}),401);
 const form={action:'register',email,password,full_name:'RailPulse QA'};
 status(await call('/api/auth',{method:'POST',body:form,origin:'https://untrusted.example'}),403);
 const registered=await call('/api/auth',{method:'POST',body:form});status(registered,201);cookie=registered.cookie;assert.ok(cookie);
 const user=(await db.query('SELECT user_id,password_hash FROM user_account WHERE email=$1',[email])).rows[0];userId=user.user_id;assert.ok(user.password_hash.startsWith('scrypt$'));assert.notEqual(user.password_hash,password);checks+=2;
 status(await call('/api/auth',{method:'POST',body:form}),409);
 status(await call('/api/auth',{method:'POST',body:{action:'login',email,password:'incorrect-long-password'}}),401);
 const login=await call('/api/auth',{method:'POST',body:{action:'login',email,password}});status(login,200);cookie=login.cookie;
 const payload=await call('/api/dashboard');status(payload,200);assert.equal(payload.json.trains.length,6);assert.equal(payload.json.journeys.length,12);assert.equal(payload.json.stops.length,258);checks+=3;
 const catalog=await call('/api/database');status(catalog,200);assert.equal(catalog.json.tables.filter(t=>t.kind==='table').length,10);assert.equal(catalog.json.tables.filter(t=>t.kind==='view').length,2);assert.equal(catalog.json.mongo.connected,true);checks+=3;
 for(const t of catalog.json.tables){const rows=await call('/api/database?table='+t.name);status(rows,200);assert.equal(rows.json.count,t.count);checks++;}
 const accounts=await call('/api/database?table=user_account');assert.ok(accounts.json.rows.every(r=>r.password_hash==='[protected]'));checks++;
 const sessions=await call('/api/database?table=auth_session');assert.ok(sessions.json.rows.every(r=>r.token_hash==='[protected]'));checks++;
 status(await call('/api/database?table='+encodeURIComponent('train;DROP TABLE train')),400);
 status(await call('/api/database?table=stop_event&page=-1'),400);
 const next=await call('/api/database?table=stop_event&page=2');status(next,200);assert.equal(next.json.rows.length,25);checks++;
 const note={train_number:'22499',category:'SERVICE',note:'QA test observation. Temporary fixture for application verification.',tags:['qa-test']};
 status(await call('/api/notes',{method:'POST',body:{...note,train_number:'99999'}}),400);
 const created=await call('/api/notes',{method:'POST',body:note});status(created,201);noteId=created.json.id;
 status(await call('/api/notes',{method:'PATCH',body:{...note,id:noteId,note:'QA updated observation. This verifies durable editing.'}}),200);
 const found=await call('/api/notes?train=22499&category=SERVICE');status(found,200);assert.ok(found.json.notes.some(n=>n.id===noteId&&n.note.includes('updated')));checks++;
 status(await call('/api/notes',{method:'DELETE',body:{id:noteId}}),200);
 const hidden=await call('/api/notes?train=22499');assert.ok(!hidden.json.notes.some(n=>n.id===noteId));assert.ok((await mongo.db(process.env.MONGODB_DB).collection('service_notes').findOne({_id:new ObjectId(noteId)})).deleted_at);checks+=2;
 const trash=await call('/api/notes?trash=true');assert.ok(trash.json.notes.some(n=>n.id===noteId));checks++;
 status(await call('/api/notes',{method:'PATCH',body:{action:'restore',id:noteId}}),200);
 const restored=await call('/api/notes?train=22499');assert.ok(restored.json.notes.some(n=>n.id===noteId));checks++;
 status(await call('/api/auth',{method:'POST',body:{action:'logout'}}),200);
 status(await call('/api/dashboard'),401);
 if(process.env.KEEP_UI_FIXTURE==='1'){await mkdir('.local',{recursive:true});await writeFile('.local/ui-qa.json',JSON.stringify({email,password,userId}),{mode:0o600});}
 console.log(`PASS: ${checks} checks — authentication, protected APIs, all database tables, paging, credential masking and durable note CRUD.`);
}finally{
 if(noteId)await mongo.db(process.env.MONGODB_DB).collection('service_notes').deleteOne({_id:new ObjectId(noteId)});
 if(userId&&process.env.KEEP_UI_FIXTURE!=='1')await db.query('DELETE FROM user_account WHERE user_id=$1 AND email=$2',[userId,email]);
 await mongo.close();await db.end();
}
