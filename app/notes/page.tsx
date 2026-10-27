import Link from 'next/link';
import { pool } from '../../lib/db';
import NotesClient from './notes-client';
export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const trains = await pool.query<{train_number:string;train_name:string}>('SELECT train_number,train_name FROM train ORDER BY train_number');
  return <main><nav className="nav"><Link href="/">Dashboard</Link><Link href="/notes" aria-current="page">Service notes</Link></nav><header><span className="eyebrow">RAILPULSE / NOSQL</span><h1>Service notes.</h1><p>Record a short observation against a train, then find it by train or category.</p><div className="notice">Local demonstration · MongoDB documents · No login</div></header><NotesClient trains={trains.rows}/><footer>Notes use MongoDB. Train numbers and optional station codes are checked against PostgreSQL. Seed notes are illustrative; user entries are separate from railway source data.</footer></main>;
}
