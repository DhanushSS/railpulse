-- =====================================================================
-- RailPulse: Indian Railway Delay Analysis and Reliability Platform
-- PostgreSQL DDL  (SQL core)  +  pgvector extension (semantic search)
-- =====================================================================

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS vector;   -- for COMPLAINT.embedding (vector similarity search)

-- ---------- Core Reference Tables ----------
CREATE TABLE zone (
    zone_id       SERIAL PRIMARY KEY,
    zone_code     VARCHAR(5)  NOT NULL UNIQUE,
    zone_name     VARCHAR(80) NOT NULL,
    headquarters  VARCHAR(80) NOT NULL
);

CREATE TABLE station (
    station_id    SERIAL PRIMARY KEY,
    station_code  VARCHAR(10) NOT NULL UNIQUE,
    station_name  VARCHAR(100) NOT NULL,
    city          VARCHAR(80)  NOT NULL,
    state         VARCHAR(80)  NOT NULL,
    zone_id       INTEGER NOT NULL REFERENCES zone(zone_id) ON DELETE RESTRICT
);
CREATE INDEX idx_station_zone ON station(zone_id);

CREATE TABLE train (
    train_id             SERIAL PRIMARY KEY,
    train_number         VARCHAR(10) NOT NULL UNIQUE,
    train_name           VARCHAR(100) NOT NULL,
    train_type           VARCHAR(30) NOT NULL
                          CHECK (train_type IN ('Rajdhani','Shatabdi','Express','Superfast','Passenger','MEMU','Vande Bharat')),
    source_station_id      INTEGER NOT NULL REFERENCES station(station_id),
    destination_station_id INTEGER NOT NULL REFERENCES station(station_id),
    CHECK (source_station_id <> destination_station_id)
);
CREATE INDEX idx_train_source ON train(source_station_id);
CREATE INDEX idx_train_dest   ON train(destination_station_id);

-- ---------- Weak entity: scheduled route (identifying relationship with TRAIN) ----------
CREATE TABLE route_stop (
    train_id            INTEGER NOT NULL REFERENCES train(train_id) ON DELETE CASCADE,
    seq_no              INTEGER NOT NULL,
    station_id          INTEGER NOT NULL REFERENCES station(station_id),
    scheduled_arrival   TIME,
    scheduled_departure TIME,
    distance_km         NUMERIC(7,2) NOT NULL CHECK (distance_km >= 0),
    halt_minutes        INTEGER NOT NULL DEFAULT 0 CHECK (halt_minutes >= 0),
    PRIMARY KEY (train_id, seq_no)
);
CREATE INDEX idx_routestop_station ON route_stop(station_id);

-- ---------- Journey (an actual run of a train on a given date) ----------
CREATE TABLE journey (
    journey_id     SERIAL PRIMARY KEY,
    train_id       INTEGER NOT NULL REFERENCES train(train_id),
    journey_date   DATE NOT NULL,
    run_status     VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                   CHECK (run_status IN ('SCHEDULED','RUNNING','COMPLETED','CANCELLED')),
    UNIQUE (train_id, journey_date),
    UNIQUE (journey_id, train_id)
);

-- ---------- Weak entity: actual stop events (identifying relationship with JOURNEY) ----------
CREATE TABLE stop_event (
    journey_id           INTEGER NOT NULL REFERENCES journey(journey_id) ON DELETE CASCADE,
    seq_no               INTEGER NOT NULL,
    station_id           INTEGER NOT NULL REFERENCES station(station_id),
    scheduled_arrival    TIMESTAMP,
    actual_arrival       TIMESTAMP,
    scheduled_departure  TIMESTAMP,
    actual_departure     TIMESTAMP,
    delay_minutes        INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    platform_no          VARCHAR(10),
    PRIMARY KEY (journey_id, seq_no)
);
CREATE INDEX idx_stopevent_station ON stop_event(station_id);
CREATE INDEX idx_stopevent_delay   ON stop_event(delay_minutes);

-- ---------- Users / roles ----------
CREATE TABLE user_account (
    user_id        SERIAL PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(120) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,       -- bcrypt/argon2 hash, never plaintext
    role           VARCHAR(20)  NOT NULL DEFAULT 'COMMUTER'
                   CHECK (role IN ('ADMIN','ANALYST','COMMUTER'))
);

-- ---------- Complaints / feedback (text-heavy -> also embedded for vector search) ----------
CREATE TABLE complaint (
    complaint_id     SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES user_account(user_id),
    train_id         INTEGER NOT NULL REFERENCES train(train_id),
    journey_id       INTEGER,   -- optional (partial participation)
    complaint_text   TEXT NOT NULL,
    category         VARCHAR(30) CHECK (category IN ('DELAY','CLEANLINESS','SAFETY','STAFF','CATERING','OTHER')),
    sentiment_score  NUMERIC(4,3) CHECK (sentiment_score BETWEEN -1 AND 1),
    embedding        vector(384),               -- sentence-embedding for semantic similarity search
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    FOREIGN KEY (journey_id, train_id) REFERENCES journey(journey_id, train_id)
);
CREATE INDEX idx_complaint_train ON complaint(train_id);
-- ANN index for fast vector similarity search (cosine distance)
CREATE INDEX idx_complaint_embedding ON complaint
    USING hnsw (embedding vector_cosine_ops);

-- ---------- Alerts (derived from journeys exceeding delay thresholds) ----------
CREATE TABLE alert (
    alert_id          SERIAL PRIMARY KEY,
    journey_id        INTEGER NOT NULL REFERENCES journey(journey_id) ON DELETE CASCADE,
    alert_type        VARCHAR(30) NOT NULL CHECK (alert_type IN ('DELAY','CANCELLATION','ROUTE_CHANGE')),
    message           VARCHAR(255) NOT NULL,
    threshold_minutes INTEGER,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_alert_journey ON alert(journey_id);


-- =====================================================================
-- VIEWS  (advanced feature #1)
-- =====================================================================

-- Average delay per train (reliability score)
CREATE VIEW vw_train_reliability AS
SELECT t.train_id, t.train_number, t.train_name,
       COUNT(se.*)                              AS stops_recorded,
       ROUND(AVG(se.delay_minutes), 2)           AS avg_delay_minutes,
       ROUND(100.0 * SUM(CASE WHEN se.delay_minutes <= 5 THEN 1 ELSE 0 END)
             / NULLIF(COUNT(se.*), 0), 2)        AS on_time_pct
FROM train t
JOIN journey j    ON j.train_id = t.train_id
JOIN stop_event se ON se.journey_id = j.journey_id
GROUP BY t.train_id, t.train_number, t.train_name;

-- Station-wise congestion / average delay
CREATE VIEW vw_station_delay_summary AS
SELECT s.station_id, s.station_name, s.state,
       COUNT(se.*)                    AS events_recorded,
       ROUND(AVG(se.delay_minutes),2) AS avg_delay_minutes
FROM station s
JOIN stop_event se ON se.station_id = s.station_id
GROUP BY s.station_id, s.station_name, s.state;


-- =====================================================================
-- TRIGGER (advanced feature #2): auto-raise an ALERT when a stop_event
-- shows a delay beyond threshold, and auto-compute delay_minutes.
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_stop_event_compute_delay() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actual_arrival IS NOT NULL AND NEW.scheduled_arrival IS NOT NULL THEN
        NEW.delay_minutes := GREATEST(0,
            EXTRACT(EPOCH FROM (NEW.actual_arrival - NEW.scheduled_arrival)) / 60)::INTEGER;
    ELSIF NEW.actual_departure IS NOT NULL AND NEW.scheduled_departure IS NOT NULL THEN
        NEW.delay_minutes := GREATEST(0,
            EXTRACT(EPOCH FROM (NEW.actual_departure - NEW.scheduled_departure)) / 60)::INTEGER;
    ELSE
        NEW.delay_minutes := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stop_event_compute_delay
BEFORE INSERT OR UPDATE ON stop_event
FOR EACH ROW EXECUTE FUNCTION fn_stop_event_compute_delay();

CREATE OR REPLACE FUNCTION fn_raise_delay_alert() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delay_minutes >= 30 AND
       (TG_OP = 'INSERT' OR OLD.delay_minutes < 30) THEN
        INSERT INTO alert (journey_id, alert_type, message, threshold_minutes)
        VALUES (NEW.journey_id, 'DELAY',
                'Delay of ' || NEW.delay_minutes || ' minutes recorded at station ' || NEW.station_id,
                30);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stop_event_alert
AFTER INSERT OR UPDATE ON stop_event
FOR EACH ROW EXECUTE FUNCTION fn_raise_delay_alert();


-- =====================================================================
-- STORED PROCEDURE / FUNCTION (advanced feature #3)
-- =====================================================================
CREATE OR REPLACE FUNCTION sp_train_delay_report(p_train_id INTEGER)
RETURNS TABLE(journey_date DATE, avg_delay NUMERIC, max_delay INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT j.journey_date,
           ROUND(AVG(se.delay_minutes), 2),
           MAX(se.delay_minutes)
    FROM journey j
    JOIN stop_event se ON se.journey_id = j.journey_id
    WHERE j.train_id = p_train_id
    GROUP BY j.journey_date
    ORDER BY j.journey_date;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM sp_train_delay_report(1);
-- By train number: SELECT r.* FROM train t CROSS JOIN LATERAL sp_train_delay_report(t.train_id) r WHERE t.train_number = '12951';


-- =====================================================================
-- SAMPLE DML / QUERIES  (JOIN, GROUP BY, HAVING, subquery, aggregate)
-- =====================================================================

-- 1. Trains with worst average delay (> 20 min), most-delayed first
-- SELECT train_number, train_name, avg_delay_minutes
-- FROM vw_train_reliability
-- WHERE avg_delay_minutes > 20
-- ORDER BY avg_delay_minutes DESC;

-- 2. Top 5 chronically delayed stations
-- SELECT station_name, avg_delay_minutes
-- FROM vw_station_delay_summary
-- ORDER BY avg_delay_minutes DESC
-- LIMIT 5;

-- 3. Journeys delayed more than the overall average delay (subquery)
-- SELECT j.journey_id, t.train_name, j.journey_date
-- FROM journey j
-- JOIN train t ON t.train_id = j.train_id
-- WHERE j.journey_id IN (
--     SELECT se.journey_id FROM stop_event se
--     GROUP BY se.journey_id
--     HAVING AVG(se.delay_minutes) > (SELECT AVG(delay_minutes) FROM stop_event)
-- );

-- 4. Vector similarity search: find complaints similar to a given complaint's embedding
-- SELECT complaint_id, complaint_text
-- FROM complaint
-- ORDER BY embedding <=> (SELECT embedding FROM complaint WHERE complaint_id = 101)
-- LIMIT 5;
