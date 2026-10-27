import fs from 'node:fs';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const input = JSON.parse(fs.readFileSync('data/selected/ntes_2026-10-25_6trains.json', 'utf8'));
const records = input.records;
const types = { MEX: 'Express', SUF: 'Superfast', PAS: 'Passenger', MEMU: 'MEMU', SHT: 'Shatabdi', VNDB: 'Vande Bharat' };
const db = new pg.Client({ connectionString });
await db.connect();
try {
  await db.query('BEGIN');
  const existing = await db.query('SELECT (SELECT count(*) FROM train) AS trains, (SELECT count(*) FROM station) AS stations');
  if (Number(existing.rows[0].trains) || Number(existing.rows[0].stations)) {
    throw new Error('Import requires an empty RailPulse schema. Use a separate database from the illustrative demo.');
  }
  const zone = await db.query(
    'INSERT INTO zone(zone_code,zone_name,headquarters) VALUES($1,$2,$3) RETURNING zone_id',
    ['UNK', 'Unknown zone', 'Unknown'],
  );
  const zoneId = zone.rows[0].zone_id;
  const stationIds = new Map();
  for (const code of [...new Set(records.map(r => r.station_code))].sort()) {
    const result = await db.query(
      'INSERT INTO station(station_code,station_name,city,state,zone_id) VALUES($1,$2,$3,$4,$5) RETURNING station_id',
      [code, code, 'Unknown', 'Unknown', zoneId],
    );
    stationIds.set(code, result.rows[0].station_id);
  }
  const groups = new Map();
  for (const row of records) {
    const key = `${row.train_number}|${row.start_date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const trainIds = new Map();
  for (const number of [...new Set(records.map(r => r.train_number))].sort()) {
    const runs = [...groups.values()].filter(run => run[0].train_number === number);
    const exemplar = runs[0];
    const type = types[exemplar[0].category];
    if (!type) throw new Error(`Unmapped category for ${number}`);
    const sourceId = stationIds.get(exemplar[0].station_code);
    const destId = stationIds.get(exemplar[exemplar.length - 1].station_code);
    const result = await db.query(
      'INSERT INTO train(train_number,train_name,train_type,source_station_id,destination_station_id) VALUES($1,$2,$3,$4,$5) RETURNING train_id',
      [number, exemplar[0].train_name, type, sourceId, destId],
    );
    trainIds.set(number, result.rows[0].train_id);
  }
  let stopCount = 0;
  for (const [key, run] of groups) {
    const [number, startDate] = key.split('|');
    const journey = await db.query(
      'INSERT INTO journey(train_id,journey_date,run_status) VALUES($1,$2,$3) RETURNING journey_id',
      [trainIds.get(number), startDate, 'COMPLETED'],
    );
    for (const row of run) {
      await db.query(
        `INSERT INTO stop_event(journey_id,seq_no,station_id,scheduled_arrival,actual_arrival,scheduled_departure,actual_departure)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [journey.rows[0].journey_id, row.seq, stationIds.get(row.station_code), row.scheduled_arrival,
          row.actual_arrival, row.scheduled_departure, row.actual_departure],
      );
      stopCount++;
    }
  }
  const counts = await db.query(
    'SELECT (SELECT count(*) FROM train)::int trains, (SELECT count(*) FROM journey)::int journeys, (SELECT count(*) FROM stop_event)::int stops, (SELECT count(*) FROM alert)::int alerts',
  );
  const result = counts.rows[0];
  if (result.trains !== 6 || result.journeys !== 12 || result.stops !== 258 || result.alerts < 1) {
    throw new Error(`Unexpected import result: ${JSON.stringify(result)}`);
  }
  await db.query('COMMIT');
  console.log('Imported observed runs:', result);
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
