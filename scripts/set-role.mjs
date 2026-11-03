import pg from 'pg';
const [email,role]=process.argv.slice(2);
if(!email||!['ADMIN','ANALYST','COMMUTER'].includes(role))throw new Error('Usage: npm run account:role -- registered@email ADMIN|ANALYST|COMMUTER');
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
try{const r=await db.query('UPDATE user_account SET role=$1 WHERE lower(email)=$2 RETURNING user_id,role',[role,email.toLowerCase()]);if(!r.rowCount)throw new Error('Register this account first.');console.log('Role updated:',r.rows[0]);}finally{await db.end();}
