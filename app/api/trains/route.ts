import { pool } from '../../../lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const result = await pool.query('SELECT * FROM vw_train_reliability ORDER BY avg_delay_minutes DESC');
  return Response.json({ sample_data: true, trains: result.rows });
}
