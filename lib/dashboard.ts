import { pool } from './db';
export type Train = { train_id:number; train_number:string; train_name:string; train_type:string; source:string; destination:string };
export type Journey = { journey_id:number; train_id:number; journey_date:string; run_status:string };
export type Stop = { journey_id:number; seq_no:number; station_id:number; station_code:string; scheduled_arrival:string|null; actual_arrival:string|null; scheduled_departure:string|null; actual_departure:string|null; delay_minutes:number };
export type DelayAlert = { alert_id:number; journey_id:number; alert_type:string; message:string; station_code:string|null; threshold_minutes:number; created_at:string };
export type DashboardData = { trains:Train[]; journeys:Journey[]; stops:Stop[]; alerts:DelayAlert[]; historical:boolean; loadedAt:string };
export async function getDashboard():Promise<DashboardData> {
  const [trains,journeys,stops,alerts] = await Promise.all([
    pool.query<Train>(`SELECT t.train_id,t.train_number,t.train_name,t.train_type,s.station_code source,d.station_code destination FROM train t JOIN station s ON s.station_id=t.source_station_id JOIN station d ON d.station_id=t.destination_station_id ORDER BY t.train_number`),
    pool.query<Journey>(`SELECT journey_id,train_id,journey_date::text,run_status FROM journey ORDER BY journey_date,journey_id`),
    pool.query<Stop>(`SELECT e.journey_id,e.seq_no,e.station_id,s.station_code,e.scheduled_arrival::text,e.actual_arrival::text,e.scheduled_departure::text,e.actual_departure::text,e.delay_minutes FROM stop_event e JOIN station s USING(station_id) ORDER BY e.journey_id,e.seq_no`),
    pool.query<DelayAlert>(`SELECT a.alert_id,a.journey_id,a.alert_type,CASE WHEN s.station_code IS NOT NULL THEN regexp_replace(a.message,'station [0-9]+$','station ' || s.station_code) ELSE a.message END message,s.station_code,a.threshold_minutes,a.created_at::text FROM alert a LEFT JOIN station s ON s.station_id=substring(a.message from 'station ([0-9]+)$')::int ORDER BY a.alert_id DESC`)
  ]);
  return {trains:trains.rows,journeys:journeys.rows,stops:stops.rows,alerts:alerts.rows,historical:process.env.DATA_MODE==='historical',loadedAt:new Date().toISOString()};
}
