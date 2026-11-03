-- Reversible course demonstration. All changes, including DDL, are rolled back.
-- Run: psql -d railpulse_observed -v ON_ERROR_STOP=1 -f sql/course_demo.sql
BEGIN;
CREATE TEMP TABLE railpulse_ddl_demo(id integer PRIMARY KEY, label text NOT NULL);
ALTER TABLE railpulse_ddl_demo ADD COLUMN reviewed boolean NOT NULL DEFAULT false;
INSERT INTO railpulse_ddl_demo VALUES(1,'Temporary course example',false);
SAVEPOINT before_edit;
UPDATE railpulse_ddl_demo SET reviewed=true WHERE id=1;
SELECT * FROM railpulse_ddl_demo;
ROLLBACK TO SAVEPOINT before_edit;
DELETE FROM railpulse_ddl_demo WHERE id=1;
DROP TABLE railpulse_ddl_demo;
-- Real project queries: relationships, aggregates, filtering and a subquery.
SELECT t.train_number,COUNT(*) observed_stops,ROUND(AVG(s.delay_minutes),2) average_delay
FROM train t JOIN journey j USING(train_id) JOIN stop_event s USING(journey_id)
GROUP BY t.train_id HAVING AVG(s.delay_minutes)>(SELECT AVG(delay_minutes) FROM stop_event)
ORDER BY average_delay DESC;
SELECT * FROM vw_train_reliability ORDER BY avg_delay_minutes DESC;
SELECT t.train_number,r.* FROM train t CROSS JOIN LATERAL sp_train_delay_report(t.train_id) r ORDER BY t.train_number,r.journey_date;
ROLLBACK;
