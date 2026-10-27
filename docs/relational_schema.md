# RailPulse - Relational Schema

PK = Primary Key, FK = Foreign Key, (nullable) = optional field

```
ZONE (zone_id PK, zone_code, zone_name, headquarters)

STATION (station_id PK, station_code, station_name, city, state,
         zone_id FK -> ZONE)

TRAIN (train_id PK, train_number, train_name, train_type,
       source_station_id FK -> STATION,
       destination_station_id FK -> STATION)

ROUTE_STOP (train_id PK,FK -> TRAIN, seq_no PK,
            station_id FK -> STATION,
            scheduled_arrival, scheduled_departure,
            distance_km, halt_minutes)
            -- weak entity; identified by (train_id, seq_no)

JOURNEY (journey_id PK, train_id FK -> TRAIN,
         journey_date, run_status)

STOP_EVENT (journey_id PK,FK -> JOURNEY, seq_no PK,
            station_id FK -> STATION,
            scheduled_arrival, actual_arrival,
            scheduled_departure, actual_departure,
            delay_minutes, platform_no)
            -- weak entity; identified by (journey_id, seq_no)

USER_ACCOUNT (user_id PK, full_name, email, password_hash, role)

COMPLAINT (complaint_id PK,
           user_id FK -> USER_ACCOUNT,
           train_id FK -> TRAIN,
           journey_id FK -> JOURNEY (nullable),
           complaint_text, category, sentiment_score,
           embedding, created_at)

ALERT (alert_id PK, journey_id FK -> JOURNEY,
       alert_type, message, threshold_minutes, created_at)
```

## Relationships

| Entity A | Card. | Relationship | Card. | Entity B |
|---|---|---|---|---|
| ZONE | 1 | has | N | STATION |
| TRAIN | N | originates_at | 1 | STATION |
| TRAIN | N | terminates_at | 1 | STATION |
| TRAIN | 1 | has (identifying) | N | ROUTE_STOP |
| ROUTE_STOP | N | stop_at | 1 | STATION |
| TRAIN | 1 | runs | N | JOURNEY |
| JOURNEY | 1 | has (identifying) | N | STOP_EVENT |
| STOP_EVENT | N | recorded_at | 1 | STATION |
| USER_ACCOUNT | 1 | files | N | COMPLAINT |
| COMPLAINT | N | about | 1 | TRAIN |
| COMPLAINT | N | related_to (optional) | 0..1 | JOURNEY |
| JOURNEY | 1 | triggers | N | ALERT |

## Notes

- ROUTE_STOP and STOP_EVENT are weak entities - their PK is composite (owner's key + seq_no), since a stop number alone means nothing without knowing which train/journey it belongs to.
- COMPLAINT -> JOURNEY is the only optional relationship - a complaint can be about a train in general without pointing to one specific run.
