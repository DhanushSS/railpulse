-- RAILPULSE POSTGRESQL DEMONSTRATION (read-only)
-- Database: railpulse_observed. Execute in pgAdmin Query Tool or psql.

-- 1. Every project table and view
SELECT table_name,table_type FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_type,table_name;

-- 2. Actual train services and their dated journeys
SELECT t.train_number,t.train_name,j.journey_date,j.run_status
FROM train t JOIN journey j USING(train_id)
ORDER BY t.train_number,j.journey_date;

-- 3. Relationship between a stop observation and its train
SELECT t.train_number,j.journey_date,s.seq_no,st.station_code,
       s.scheduled_arrival,s.actual_arrival,s.delay_minutes
FROM train t JOIN journey j USING(train_id)
JOIN stop_event s USING(journey_id) JOIN station st USING(station_id)
ORDER BY j.journey_id,s.seq_no LIMIT 12;

-- 4. Reliability view: aggregate and on-time percentages
SELECT * FROM vw_train_reliability ORDER BY avg_delay_minutes DESC;

-- 5. HAVING plus a scalar subquery: services above the sample mean
SELECT t.train_number,ROUND(AVG(s.delay_minutes),2) AS average_delay
FROM train t JOIN journey j USING(train_id) JOIN stop_event s USING(journey_id)
GROUP BY t.train_id
HAVING AVG(s.delay_minutes)>(SELECT AVG(delay_minutes) FROM stop_event)
ORDER BY average_delay DESC;

-- 6. Stored function for each train
SELECT t.train_number,r.journey_date,r.avg_delay,r.max_delay
FROM train t CROSS JOIN LATERAL sp_train_delay_report(t.train_id) r
ORDER BY t.train_number,r.journey_date;

-- 7. The actual automatic delay and alert functions
SELECT pg_get_functiondef('fn_stop_event_compute_delay()'::regprocedure);
SELECT pg_get_functiondef('fn_raise_delay_alert()'::regprocedure);

-- 8. Database-enforced constraints and indexes (no credential values)
SELECT conrelid::regclass AS table_name,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE connamespace='public'::regnamespace
ORDER BY conrelid::regclass::text,conname;
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' ORDER BY tablename,indexname;

-- 9. Ranking query currently displayed in pgAdmin: CTE + window function
WITH reliability AS (
 SELECT train_number,train_name,stops_recorded,avg_delay_minutes,on_time_pct
 FROM public.vw_train_reliability
), ranked_trains AS (
 SELECT *,DENSE_RANK() OVER (ORDER BY avg_delay_minutes DESC) AS delay_rank
 FROM reliability
)
SELECT delay_rank,train_number,train_name,stops_recorded,avg_delay_minutes,on_time_pct
FROM ranked_trains ORDER BY delay_rank,train_number;
