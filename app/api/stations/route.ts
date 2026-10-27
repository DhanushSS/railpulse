import { pool } from '../../../lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const result = await pool.query('SELECT * FROM vw_station_delay_summary ORDER BY avg_delay_minutes DESC');
  return Response.json({ data_mode: process.env.DATA_MODE === 'historical' ? 'historical_sample' : 'illustrative_demo', stations: result.rows });
}
