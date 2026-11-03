# RailPulse relational schema

This is the implemented nine-table PostgreSQL design in [`../sql/railpulse_schema.sql`](../sql/railpulse_schema.sql). `PK` means primary key, `FK` foreign key, and `UK` unique key. Unless stated otherwise, fields are required. An asterisk marks a nullable field.

```text
ZONE(zone_id PK, zone_code UK, zone_name, headquarters)

STATION(station_id PK, station_code UK, station_name, city, state,
        zone_id FK → ZONE.zone_id)

TRAIN(train_id PK, train_number UK, train_name, train_type,
      source_station_id FK → STATION.station_id,
      destination_station_id FK → STATION.station_id)

ROUTE_STOP(train_id PK/FK → TRAIN.train_id, seq_no PK,
           station_id FK → STATION.station_id,
           scheduled_arrival*, scheduled_departure*, distance_km, halt_minutes)

JOURNEY(journey_id PK, train_id FK → TRAIN.train_id,
        journey_date, run_status,
        UK(train_id, journey_date), UK(journey_id, train_id))

STOP_EVENT(journey_id PK/FK → JOURNEY.journey_id, seq_no PK,
           station_id FK → STATION.station_id,
           scheduled_arrival*, actual_arrival*,
           scheduled_departure*, actual_departure*,
           delay_minutes, platform_no*)

USER_ACCOUNT(user_id PK, full_name, email UK, password_hash, role)

COMPLAINT(complaint_id PK, user_id FK → USER_ACCOUNT.user_id,
          train_id FK → TRAIN.train_id,
          journey_id*, complaint_text, category*, sentiment_score*,
          embedding*, created_at,
          FK(journey_id, train_id) → JOURNEY(journey_id, train_id))

ALERT(alert_id PK, journey_id FK → JOURNEY.journey_id,
      alert_type, message, threshold_minutes*, created_at)
```

## Key design rules

- `ROUTE_STOP` and `STOP_EVENT` are weak entities identified by `(train_id, seq_no)` and `(journey_id, seq_no)`. Deleting their parent cascades to them.
- A complaint can omit `journey_id`. If it supplies one, the composite foreign key ensures that journey belongs to the complaint's `train_id`.
- `ROUTE_STOP` stores repeatable timetable `TIME` values. `STOP_EVENT` stores `TIMESTAMP` snapshots to handle overnight and multi-day runs.
- A trigger calculates nonnegative `STOP_EVENT.delay_minutes` from the arrival pair, or from the departure pair when arrival is absent. Another trigger raises a delay alert when a stop first crosses 30 minutes.
- `COMPLAINT.embedding` is `vector(384)` with an HNSW cosine index. Embedding generation is not yet implemented.
- `sentiment_score` is constrained to −1 through 1. `train_type`, `run_status`, `role`, `category`, and `alert_type` have allowed-value checks in the DDL.
- `vw_train_reliability` and `vw_station_delay_summary` are reporting views; `sp_train_delay_report(train_id)` is a stored function.

## Data currently loaded locally

The separate `railpulse_observed` database contains a historical sample of six trains, 12 runs, and 258 stop events. Its [source file](../data/SOURCE.md) has station codes but no station names, zones, or distances. The historical import leaves `ROUTE_STOP` empty; `USER_ACCOUNT` and `COMPLAINT` receive records only from account registration and user feedback. placeholder location fields are marked `Unknown`. This does not change the schema above.
