import { pool } from '../lib/db';
export const dynamic = 'force-dynamic';

type Train = {train_number:string; train_name:string; stops_recorded:string; avg_delay_minutes:string; on_time_pct:string};
type Station = {station_name:string; state:string; events_recorded:string; avg_delay_minutes:string};
type Alert = {message:string; created_at:string};
export default async function Home() {
  const [trains, stations, alerts] = await Promise.all([
    pool.query<Train>('SELECT train_number, train_name, stops_recorded, avg_delay_minutes, on_time_pct FROM vw_train_reliability ORDER BY avg_delay_minutes DESC'),
    pool.query<Station>('SELECT station_name, state, events_recorded, avg_delay_minutes FROM vw_station_delay_summary ORDER BY avg_delay_minutes DESC'),
    pool.query<Alert>('SELECT message, created_at FROM alert ORDER BY alert_id DESC LIMIT 10')
  ]);
  return <main><header><span className="eyebrow">RAILPULSE / DEMONSTRATION</span><h1>Reliability, in view.</h1><p>Scheduled service and actual stop events in one place.</p><div className="notice">Illustrative sample data · Not live train status</div></header><section><h2>Train reliability</h2><div className="table-wrap"><table><thead><tr><th>Train</th><th>Stops</th><th>Avg delay</th><th>On time</th></tr></thead><tbody>{trains.rows.map(t=><tr key={t.train_number}><td><strong>{t.train_number}</strong><br/>{t.train_name}</td><td>{t.stops_recorded}</td><td>{t.avg_delay_minutes} min</td><td>{t.on_time_pct}%</td></tr>)}</tbody></table></div></section><section><h2>Station delay ranking</h2><div className="table-wrap"><table><thead><tr><th>Station</th><th>Events</th><th>Avg delay</th></tr></thead><tbody>{stations.rows.map(s=><tr key={s.station_name}><td><strong>{s.station_name}</strong><br/>{s.state}</td><td>{s.events_recorded}</td><td>{s.avg_delay_minutes} min</td></tr>)}</tbody></table></div></section><section><h2>Recent alerts</h2><ul className="alerts">{alerts.rows.map((a,i)=><li key={i}>{a.message}</li>)}</ul></section><footer>Data is created by sql/seed_demo.sql. Delay and alerts are computed by PostgreSQL triggers.</footer></main>;
}
