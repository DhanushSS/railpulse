-- Illustrative data only. These are not live Indian Railways records.
INSERT INTO zone(zone_code,zone_name,headquarters) VALUES
('NR','Northern Railway','New Delhi'),('SR','Southern Railway','Chennai');
INSERT INTO station(station_code,station_name,city,state,zone_id) VALUES
('NDLS','New Delhi','New Delhi','Delhi',1),
('AGC','Agra Cantt','Agra','Uttar Pradesh',1),
('MAS','Chennai Central','Chennai','Tamil Nadu',2);
INSERT INTO train(train_number,train_name,train_type,source_station_id,destination_station_id) VALUES
('12627','Demo North-South Express','Superfast',1,3);
INSERT INTO route_stop(train_id,seq_no,station_id,scheduled_arrival,scheduled_departure,distance_km,halt_minutes) VALUES
(1,1,1,NULL,'22:30',0,0),(1,2,2,'00:15','00:20',195,5),(1,3,3,'19:30',NULL,2180,0);
INSERT INTO journey(train_id,journey_date,run_status) VALUES
(1,'2026-10-01','COMPLETED'),(1,'2026-10-02','COMPLETED');
INSERT INTO stop_event(journey_id,seq_no,station_id,scheduled_departure,actual_departure) VALUES
(1,1,1,'2026-10-01 22:30','2026-10-01 23:00'),
(2,1,1,'2026-10-02 22:30','2026-10-02 22:35');
INSERT INTO stop_event(journey_id,seq_no,station_id,scheduled_arrival,actual_arrival) VALUES
(1,2,2,'2026-10-02 00:15','2026-10-02 01:00'),
(1,3,3,'2026-10-02 19:30','2026-10-02 19:40'),
(2,2,2,'2026-10-03 00:15','2026-10-03 00:20'),
(2,3,3,'2026-10-03 19:30','2026-10-03 20:05');
