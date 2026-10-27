-- Run after seed_demo.sql. All writes are rolled back.
BEGIN;
DO $$
DECLARE
  before_alerts integer;
  after_alerts integer;
  delay integer;
BEGIN
  SELECT count(*) INTO before_alerts FROM alert;
  UPDATE stop_event SET platform_no = '3' WHERE journey_id = 1 AND seq_no = 1;
  SELECT count(*) INTO after_alerts FROM alert;
  IF before_alerts <> after_alerts THEN RAISE EXCEPTION 'Duplicate alert on unrelated update'; END IF;
  INSERT INTO journey(train_id,journey_date,run_status) VALUES (1,'2026-10-27','RUNNING');
  INSERT INTO stop_event(journey_id,seq_no,station_id,scheduled_arrival,actual_arrival)
  VALUES (currval('journey_journey_id_seq'),2,2,'2026-10-27 23:50','2026-10-28 00:20');
  SELECT delay_minutes INTO delay FROM stop_event WHERE journey_id = currval('journey_journey_id_seq') AND seq_no=2;
  IF delay <> 30 THEN RAISE EXCEPTION 'Midnight delay expected 30, got %', delay; END IF;
END $$;
ROLLBACK;
