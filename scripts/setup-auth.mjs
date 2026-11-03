import {readFile} from 'node:fs/promises';
import pg from 'pg';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
try{await db.query(await readFile(new URL('../sql/auth.sql',import.meta.url),'utf8'));await db.query(await readFile(new URL('../sql/feedback-validation.sql',import.meta.url),'utf8'));console.log('Authentication and feedback validation ready. Create your account at /login.');}finally{await db.end();}
