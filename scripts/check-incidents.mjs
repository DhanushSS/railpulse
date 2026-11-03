import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import pg from 'pg';import {MongoClient,ObjectId} from 'mongodb';
const base=process.env.APP_URL||'http://localhost:3100',users=[];const sql=new pg.Client({connectionString:process.env.DATABASE_URL});const mongo=new MongoClient(process.env.MONGODB_URI);await sql.connect();await mongo.connect();const c=mongo.db(process.env.MONGODB_DB).collection('incident_reviews');let id,checks=0;
async function call(path,cookie='',method='GET',body){const r=await fetch(base+path,{method,headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
function expect(r,n){assert.equal(r.status,n,JSON.stringify(r.body));checks++;return r;}
try{
 expect(await call('/api/incidents'),401);
 for(let i=0;i<2;i++){const email=`incident-qa-${randomBytes(6).toString('hex')}@example.invalid`;const r=expect(await call('/api/auth','','POST',{action:'register',email,password:randomBytes(20).toString('hex'),full_name:'Temporary incident QA'}),201);users.push({email,cookie:r.cookie,id:(await sql.query('SELECT user_id FROM user_account WHERE email=$1',[email])).rows[0].user_id});}
 const [a,b]=users;await sql.query("UPDATE user_account SET role='ADMIN' WHERE user_id=$1",[b.id]);
 const data={train_number:'22499',title:'uniquereviewtoken temporary check',description:'Temporary investigation workflow validation.',priority:'HIGH'};
 expect(await call('/api/incidents',a.cookie,'POST',{...data,train_number:'99999'}),400);
 id=expect(await call('/api/incidents',a.cookie,'POST',data),201).body.id;
 expect(await call('/api/incidents',a.cookie,'PATCH',{id,update:'Analyst has added evidence to the timeline.'}),200);
 expect(await call('/api/incidents',a.cookie,'PATCH',{id,update:'Analyst tries changing status for verification.',status:'RESOLVED'}),403);
 expect(await call('/api/incidents',b.cookie,'PATCH',{id,update:'Administrator completed this temporary review.',status:'RESOLVED'}),200);
 const r=expect(await call('/api/incidents?q=uniquereviewtoken&status=RESOLVED',a.cookie),200);assert.equal(r.body.records.length,1);assert.equal(r.body.records[0].updates.length,2);assert.equal(r.body.statusSummary[0].count,1);assert.equal(r.body.trainSummary[0].updates,2);checks+=4;
 const catalog=expect(await call('/api/database',a.cookie),200);assert.equal(catalog.body.mongo.collections.length,2);checks++;
 const rows=expect(await call('/api/database?table=incident_reviews',a.cookie),200);assert.ok(rows.body.columns.includes('updates'));checks++;
 try{await c.insertOne({title:'invalid'});throw new Error('Validator failed');}catch(e){assert.equal(e.code,121);checks++;}
 assert.ok((await c.indexes()).some(x=>x.name==='review_text_search'));checks++;
 console.log(`PASS: ${checks} incident checks: create, embedded updates, roles, text search, facets, explorer, validation and indexes.`);
}finally{if(id)await c.deleteOne({_id:new ObjectId(id)});for(const u of users)await sql.query('DELETE FROM user_account WHERE user_id=$1 AND email=$2',[u.id,u.email]);await mongo.close();await sql.end();}
