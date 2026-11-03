import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
const base=process.env.APP_URL||'http://localhost:3100';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
const users=[];let checks=0;
async function request(path,cookie='',method='GET',body){const r=await fetch(base+path,{method,headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
function expect(r,status){assert.equal(r.status,status,JSON.stringify(r.body));checks++;return r;}
try{
 for(let i=0;i<3;i++){const email=`course-${randomBytes(6).toString('hex')}@example.invalid`;const r=expect(await request('/api/auth','','POST',{action:'register',email,password:randomBytes(24).toString('hex'),full_name:'Temporary course QA',role:'ADMIN'}),201);const id=(await db.query('SELECT user_id FROM user_account WHERE email=$1',[email])).rows[0].user_id;users.push({id,email,cookie:r.cookie});}
 assert.ok((await db.query('SELECT role FROM user_account WHERE user_id=ANY($1)',[users.map(u=>u.id)])).rows.every(r=>r.role==='ANALYST'));checks++;
 const [a,b,admin]=users;await db.query("UPDATE user_account SET role='ADMIN' WHERE user_id=$1",[admin.id]);
 expect(await request('/api/complaints'),401);expect(await request('/api/reports'),401);expect(await request('/api/reports',a.cookie),403);
 const report=expect(await request('/api/reports',admin.cookie),200);assert.equal(report.body.daily.length,12);assert.match(report.body.daily[0].journey_date,/^\d{4}-\d{2}-\d{2}$/);checks++;assert.ok(Array.isArray(report.body.notes));checks+=2;
 const trains=(await request('/api/dashboard',a.cookie)).body.trains;const train=trains[0].train_id;
 const body={train_id:train,text:'Temporary course test feedback for SQL CRUD.',category:'DELAY'};
 const created=expect(await request('/api/complaints',a.cookie,'POST',body),201);const id=created.body.id;
 expect(await request('/api/complaints',a.cookie,'POST',{...body,text:'x'}),400);
 const wrongJourney=(await db.query('SELECT journey_id FROM journey WHERE train_id<>$1 LIMIT 1',[train])).rows[0].journey_id;
 expect(await request('/api/complaints',a.cookie,'POST',{...body,journey_id:wrongJourney}),400);
 expect(await request('/api/complaints',b.cookie,'PATCH',{...body,id}),404);
 expect(await request('/api/complaints',b.cookie,'DELETE',{id}),404);
 const hidden=expect(await request('/api/complaints',b.cookie),200);assert.ok(!hidden.body.rows.some(r=>r.complaint_id===id));checks++;
 const explorer=expect(await request('/api/database?table=complaint',b.cookie),200);assert.ok(!explorer.body.rows.some(r=>r.complaint_id===id));checks++;
 const own=expect(await request('/api/database?table=user_account',b.cookie),200);assert.ok(own.body.rows.every(r=>r.user_id===b.id));checks++;
 expect(await request('/api/complaints',a.cookie,'PATCH',{...body,id,text:'Updated course test feedback for SQL CRUD.'}),200);
 const all=expect(await request('/api/complaints',admin.cookie),200);assert.ok(all.body.rows.some(r=>r.complaint_id===id));checks++;
 expect(await request('/api/complaints',admin.cookie,'PATCH',{...body,id,text:'Admin reviewed temporary course test feedback.'}),200);
 expect(await request('/api/complaints',admin.cookie,'DELETE',{id}),200);
 assert.equal((await db.query('SELECT 1 FROM complaint WHERE complaint_id=$1',[id])).rowCount,0);checks++;
 await db.query('BEGIN');try{await db.query('INSERT INTO complaint(user_id,train_id,complaint_text) VALUES($1,$2,$3)',[a.id,train,'x']);throw new Error('Validation did not reject invalid row');}catch(e){assert.equal(e.code,'23514');checks++;}finally{await db.query('ROLLBACK');}
 console.log(`PASS: ${checks} course checks: two roles, ownership, SQL CRUD, reports, relational and database validation.`);
}finally{for(const u of users){await db.query('DELETE FROM complaint WHERE user_id=$1',[u.id]);await db.query('DELETE FROM user_account WHERE user_id=$1 AND email=$2',[u.id,u.email]);}await db.end();}
