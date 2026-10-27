import pg from 'pg';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const db = new pg.Client({ connectionString });
await db.connect();
try {
  const objects = await db.query(`SELECT
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
    (SELECT count(*)::int FROM pg_views WHERE schemaname='public') AS views,
    (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgrelid='stop_event'::regclass) AS triggers`);
  const {tables, views, triggers} = objects.rows[0];
  if (![9,10].includes(tables) || views !== 2 || triggers !== 2) throw new Error(`Unexpected objects: ${JSON.stringify(objects.rows[0])}`);
  const values = await db.query(`SELECT train_number, stops_recorded, avg_delay_minutes, on_time_pct FROM vw_train_reliability WHERE train_number='12627'`);
  if (values.rowCount) {
    const row = values.rows[0];
    if (Number(row.stops_recorded) !== 6 || Number(row.avg_delay_minutes) !== 21.67 || Number(row.on_time_pct) !== 33.33) throw new Error(`Unexpected demo summary: ${JSON.stringify(row)}`);
  }
  if (process.env.DATA_MODE === 'historical') {
    const counts = await db.query('SELECT (SELECT count(*) FROM train)::int trains, (SELECT count(*) FROM journey)::int journeys, (SELECT count(*) FROM stop_event)::int stops');
    const row = counts.rows[0];
    if (row.trains !== 6 || row.journeys !== 12 || row.stops !== 258) throw new Error(`Unexpected historical sample: ${JSON.stringify(row)}`);
  }
  console.log('Database check passed:', {tables, views, triggers, mode:process.env.DATA_MODE});
} finally { await db.end(); }
