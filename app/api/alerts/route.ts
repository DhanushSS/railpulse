import { pool } from '../../../lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const result = await pool.query('SELECT * FROM alert ORDER BY alert_id DESC LIMIT 50');
  return Response.json({ sample_data: true, alerts: result.rows });
}
