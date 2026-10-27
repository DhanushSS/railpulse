import Link from 'next/link';
import { pool } from '../lib/db';
export const dynamic = 'force-dynamic';

type Train = {train_number:string; train_name:string; stops_recorded:string; avg_delay_minutes:string; on_time_pct:string};
type Station = {station_name:string; state:string; events_recorded:string; avg_delay_minutes:string};
type Alert = {message:string; created_at:string};
export default async function Home() {
  const historical = process.env.DATA_MODE === 'historical';
  const [trains, stations, alerts, dates] = await Promise.all([
    pool.query<Train>('SELECT train_number, train_name, stops_recorded, avg_delay_minutes, on_time_pct FROM vw_train_reliability ORDER BY avg_delay_minutes DESC'),
    pool.query<Station>('SELECT station_name, state, events_recorded, avg_delay_minutes FROM vw_station_delay_summary ORDER BY avg_delay_minutes DESC LIMIT 10'),
    pool.query<Alert>(`SELECT CASE WHEN $1::boolean THEN regexp_replace(a.message, 'station [0-9]+$', 'station ' || COALESCE(s.station_code, 'unknown')) ELSE a.message END AS message, a.created_at
                       FROM alert a LEFT JOIN station s ON s.station_id = substring(a.message from 'station ([0-9]+)$')::int
                       ORDER BY a.alert_id DESC LIMIT 10`, [historical]),
    pool.query<{first_date:string; last_date:string}>('SELECT min(journey_date)::text AS first_date, max(journey_date)::text AS last_date FROM journey')
  ]);
  return <main><nav className="nav"><Link href="/" aria-current="page">Dashboard</Link><Link href="/notes">Service notes</Link></nav><header><span className="eyebrow">RAILPULSE / {historical ? 'HISTORICAL SAMPLE' : 'DEMONSTRATION'}</span><h1>Reliability, in view.</h1><p>Scheduled service and actual stop events in one place.</p><div className="notice">{historical ? `Sourced observations · Runs starting ${dates.rows[0]?.first_date} to ${dates.rows[0]?.last_date} · Not live status` : 'Illustrative sample data · Not live train status'}</div></header><section><h2>Train reliability</h2><div className="table-wrap"><table><thead><tr><th>Train</th><th>Stops</th><th>Avg delay</th><th>On time</th></tr></thead><tbody>{trains.rows.map(t=><tr key={t.train_number}><td><strong>{t.train_number}</strong><br/>{t.train_name}</td><td>{t.stops_recorded}</td><td>{t.avg_delay_minutes} min</td><td>{t.on_time_pct}%</td></tr>)}</tbody></table></div></section><section><h2>{historical ? 'Top 10 station codes by delay' : 'Station delay ranking'}</h2><div className="table-wrap"><table><thead><tr><th>{historical ? 'Station code' : 'Station'}</th><th>Events</th><th>Avg delay</th></tr></thead><tbody>{stations.rows.map(s=><tr key={s.station_name}><td><strong>{s.station_name}</strong>{!historical && <><br/>{s.state}</>}</td><td>{s.events_recorded}</td><td>{s.avg_delay_minutes} min</td></tr>)}</tbody></table></div></section><section><h2>{historical ? 'Delay alerts in sample' : 'Recent alerts'}</h2><ul className="alerts">{alerts.rows.map((a,i)=><li key={i}>{a.message}</li>)}</ul></section><footer>{historical ? <>Historical sample from <a href="https://huggingface.co/datasets/pjay-in/indian-railways-delays">pjay-in/indian-railways-delays</a> (CC BY 4.0). Station names, zones, and distances are absent from the source. Some times may be estimated. </> : 'Data is created by sql/seed_demo.sql. '}Delay and alerts are computed by PostgreSQL triggers.</footer></main>;
}
