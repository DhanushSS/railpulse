# RailPulse — Project Audit Report

**Project:** RailPulse: Indian Railway Delay Analysis and Reliability Platform
**Course context:** DBMS Experiential Learning, Level 3 mini project (2-member team)
**Audit date:** 2026-10-27
**Auditor:** Claude (Sonnet 5.5), working in a sandbox with a real PostgreSQL 16.15 + pgvector 0.6.0
**Report purpose:** a complete, self-contained description of the project, its audit results, and every source artifact — written so that another AI coding assistant (e.g. Codex) can learn the project and continue it correctly.

---

## 0. How to read this file (instructions for Codex / any AI assistant)

1. **This file is self-contained.** Every source artifact (relational schema, DDL, demo/test SQL, UML code, ER-diagram source) is embedded in the appendices. You do not need any other file to understand the database design.
2. **Authority rule.** Where this report and any *earlier* RailPulse file disagree, **this report and the corrected files described here win.** Earlier versions contained bugs (Section 5.1). Never reintroduce them.
3. **Status vocabulary** used throughout:
   - **VERIFIED** — executed or rendered during this audit and the output was inspected.
   - **DESIGNED** — written or specified, but never executed or built.
   - **NOT STARTED** — no artifact exists.
   - **FIXED** — a defect found in this audit and corrected (and re-tested).
   - **OPEN** — a known issue or decision that is *not* resolved.
4. **Do not invent.** The web application, API, authentication, embedding pipeline, seed data, screenshots and application tests **do not exist yet** (Section 4). Do not describe them as if they do.
5. Section 8 ("Invariants") lists rules the code you write must obey. Read it before writing any application code that touches the database.

---

## 1. Executive summary

**Bottom line:** the *database design layer* is now sound and has been executed end-to-end in a real PostgreSQL. The *application layer* (Next.js UI, API, auth, embedding pipeline, data, tests, screenshots, Git) has **not been started**. Roughly: the database half of a Level 3 project is done; the application half and the evidence that goes with it is still to do.

**Honest correction of earlier work.** Earlier in this conversation the DDL was described as "runnable". It had never been executed. Running it for the first time failed on its very first statement and silently skipped the project's headline feature (the `complaint` table with vector search). Executing and testing it found the defects below, all now fixed and re-tested.

| Layer | Status | Notes |
|---|---|---|
| Chen ER diagram | VERIFIED (rendered) | Notation corrected in this audit (double lines, derived attributes) |
| UML class diagram | VERIFIED (rendered) | Rendering bug and arrow direction corrected |
| Relational schema | DESIGNED | Consistent with the DDL; updated for the composite FK |
| DDL (tables, constraints, indexes) | VERIFIED (executed) | 9 tables, 2 views, 2 triggers, 3 functions, loads with exit code 0 |
| Advanced DB features | VERIFIED (executed) | Views, triggers, stored function, B-tree + HNSW indexes, vector similarity search, transactions |
| DML demo (INSERT/UPDATE/DELETE/SELECT, ALTER/DROP) | VERIFIED (executed) | `railpulse_demo.sql`, results match hand-computed expectations |
| Word project report | DESIGNED | Written and patched for consistency; several sections describe *plans* in present tense (O11) |
| Real or realistic data / seed pipeline | NOT STARTED | Only 3 stations, 2 trains of illustrative sample data exist |
| Embedding pipeline (text → 384-d vector) | NOT STARTED | Model named in the report, never run |
| Next.js UI, API routes, authentication | NOT STARTED | Required by the brief (requirements 9–11) |
| Application tests, screenshots | NOT STARTED | DB-level test evidence exists (Section 6) |
| Git/GitHub repository, README | NOT STARTED / unknown | None seen in this conversation |

**Findings at a glance** (details in Section 5):

| Severity | Count | Examples |
|---|---|---|
| Critical | 1 | `CREATE EXTENSION pgvector` fails (the extension is named `vector`); `complaint` table never created |
| High | 4 | Duplicate alerts on every UPDATE; midnight-crossing delays recorded as 0; origin-stop delays ignored; vector index silently dropping rows |
| Medium | 6 | Wrong stored-function example; contradictory complaint/journey data accepted; out-of-range sentiment accepted; negative delays accepted; UML members drawn as methods; ER notation errors |
| Low | 3 | Redundant index, misnamed function, stale/unsupported claims in the Word report |
| Open (unresolved) | 13 | Mostly: no application, no data source, no DB-level role enforcement (Section 5.2) |

---

## 2. What the project is

### 2.1 Problem and idea

Train delays on Indian Railways are a chronic, visible problem. Timetable data and "running status" data exist separately, and passengers write free-text complaints, but there is no single place that (a) records scheduled vs. actual times, (b) computes how reliable each train and station is, and (c) connects the numbers to what passengers actually say.

RailPulse is a database-centred platform that:

1. Stores the **scheduled timetable** (which train stops where, in what order, at what time).
2. Stores **actual runs** (a train on a specific date) and, for each stop, the actual arrival/departure.
3. **Computes delay automatically** and **raises an alert** when a stop is badly late.
4. Offers **reliability reports** (average delay per train, on-time percentage, worst stations).
5. Stores **passenger complaints** as text plus a numeric "meaning fingerprint" (an *embedding*), so that complaints with similar meaning can be found even when the wording differs ("AC not working" ≈ "coach way too hot, no cooling").

### 2.2 Plain-language summary (for non-experts)

Think of the database as a very organised notebook. One section lists the railway zones, another the stations, another the trains. A "route" page says the planned order of stops. Each day a train runs, a new "journey" entry is made, and at every stop the real arrival time is written next to the planned one — the computer works out how late it was and shouts (creates an alert) if it is 30 minutes or more. Passengers can also write complaints; the computer turns each complaint into a list of 384 numbers that captures its meaning, so it can later answer "show me complaints like this one".

### 2.3 Roles (from the requirements: minimum 2)

| Role | Intended permissions | Enforced where |
|---|---|---|
| `ADMIN` | Create/edit zones, stations, trains, routes | **Not yet enforced** (needs the application layer) |
| `ANALYST` | Read dashboards, read all complaints, run similarity search | Not yet enforced |
| `COMMUTER` | File complaints, view own complaints, similar-complaint search | Not yet enforced |

The `user_account.role` column and its CHECK constraint exist and are verified. Enforcement is OPEN item O5.

### 2.4 Why SQL + a vector database (requirement 18: justify the choice)

The brief requires a justified choice, not technology for its own sake.

- **Relational (PostgreSQL)** fits timetables, journeys, stop events and users: strongly structured, many foreign-key relationships, needs transactions, constraints, joins and aggregation (average delay per train, ranking stations).
- **Vector search (pgvector, inside the same PostgreSQL)** fits only the *text-heavy* part — complaints — where value comes from *meaning*, not exact words. A `LIKE` or keyword search would treat "AC not working" and "way too hot" as unrelated.
- **One engine, not two.** pgvector is an extension of PostgreSQL, so embeddings live next to the relational rows (same transaction, same foreign keys, no synchronisation problem between two databases).
- **Rejected alternative:** MongoDB/NoSQL. Nothing in this domain is schemaless; live GPS-style streaming (where a document store could help) is explicitly out of scope.

### 2.5 Entities (final design — 9 tables)

| Entity | Purpose | Primary key | Notes |
|---|---|---|---|
| `zone` | Railway zone (e.g. Southern Railway) | `zone_id` | `zone_code` UNIQUE |
| `station` | A station; belongs to one zone | `station_id` | `station_code` UNIQUE; FK to `zone` (ON DELETE RESTRICT) |
| `train` | A train service | `train_id` | `train_number` UNIQUE (e.g. "12627"); source ≠ destination enforced |
| `route_stop` | **Weak.** One *scheduled* stop of a train | `(train_id, seq_no)` | Timetable; times are `TIME` (see O4) |
| `journey` | One actual run of a train on one date | `journey_id` | UNIQUE `(train_id, journey_date)` |
| `stop_event` | **Weak.** What *actually* happened at one stop of one journey | `(journey_id, seq_no)` | Times are `TIMESTAMP`; `delay_minutes` is computed by a trigger |
| `user_account` | App users with a role | `user_id` | `email` UNIQUE; `password_hash` (never plaintext) |
| `complaint` | Passenger feedback + embedding | `complaint_id` | `embedding vector(384)`; optional link to a journey |
| `alert` | System-raised delay alerts | `alert_id` | Created by a trigger, not by the application |

### 2.6 Relationships and cardinalities

| From | Card. | Relationship | Card. | To | Participation notes |
|---|---|---|---|---|---|
| `zone` | 1 | has | N | `station` | total on both sides |
| `train` | N | originates_at | 1 | `station` | total |
| `train` | N | terminates_at | 1 | `station` | total |
| `train` | 1 | has *(identifying)* | N | `route_stop` | weak entity depends on train |
| `route_stop` | N | stop_at | 1 | `station` | total |
| `train` | 1 | runs | N | `journey` | total |
| `journey` | 1 | has *(identifying)* | N | `stop_event` | weak entity depends on journey |
| `stop_event` | N | recorded_at | 1 | `station` | total |
| `user_account` | 1 | files | N | `complaint` | total |
| `complaint` | N | about | 1 | `train` | total |
| `complaint` | N | related_to | 0..1 | `journey` | **partial** (the only optional link) |
| `journey` | 1 | triggers | N | `alert` | total |

### 2.7 Why two weak entities

A "stop number 3" means nothing without knowing *which train's route* (or *which journey*) it belongs to, exactly like "page 5" needs a book. So `route_stop` is identified by `(train_id, seq_no)` and `stop_event` by `(journey_id, seq_no)`. In Chen notation they are double rectangles connected through double diamonds (identifying relationships). In SQL they are composite primary keys with `ON DELETE CASCADE` from the owner.

### 2.8 Computed data and deliberate redundancy

Two places deviate from textbook normal forms **on purpose**:

- `stop_event.scheduled_*` repeats information that also lives in `route_stop`. This is a **snapshot**: timetables change over time, and an actual run must remember what was scheduled *on that day*.
- `stop_event.delay_minutes` is derived from the four timestamp columns but is **stored**, computed by a BEFORE trigger, so reliability queries and indexes are fast and the application can never write an inconsistent value.

In Chen notation, derived attributes are drawn as dashed ellipses: `delay_minutes`, `sentiment_score`, `embedding`.

### 2.9 Advanced database features implemented and executed

| Feature | Object(s) | What it does |
|---|---|---|
| Views | `vw_train_reliability`, `vw_station_delay_summary` | Average delay, on-time % (≤ 5 min), per train / per station |
| Triggers | `trg_stop_event_compute_delay` (BEFORE INSERT/UPDATE), `trg_stop_event_alert` (AFTER INSERT/UPDATE) | Compute delay; insert an `alert` when a stop first reaches 30 min |
| Stored function | `sp_train_delay_report(p_train_id)` | Per-date average and maximum delay for a train |
| Indexing | B-tree indexes on FKs and delay; **HNSW** (cosine) on `complaint.embedding` | Fast joins, filters and nearest-neighbour search |
| Vector similarity search | `embedding <=> other_embedding` | Cosine-distance nearest neighbours |
| Transactions | `BEGIN … SAVEPOINT … ROLLBACK TO SAVEPOINT … COMMIT` (in demo) | Atomic changes with partial rollback |
| Constraints | CHECK, UNIQUE, FK (incl. composite FK), NOT NULL, defaults | Database-level validation (requirement 12) |

### 2.10 How the planned system flows (target architecture — NOT BUILT)

```
Browser (Next.js pages)
   │  fetch
   ▼
Next.js Route Handlers (API layer)  ── checks role (JWT / HTTP-only cookie) ── parameterised SQL
   │                                    │
   │                                    └── embedding model call when a complaint is submitted
   ▼
PostgreSQL 16 + pgvector
   ├─ relational tables, views, triggers, function
   └─ complaint.embedding vector(384) + HNSW index
```
Database credentials come from environment variables (`.env`, never committed). Nothing in this diagram exists as code yet.

---

## 3. Audit scope and method

**Artifacts audited:** the uploaded requirements document (`DBMS Level 3 Mini_Project Requirements`), and everything produced earlier in this conversation: the Chen ER diagram (PNG, Graphviz DOT, draw.io), UML class diagram (PNG, Mermaid), relational schema (txt/md/docx), DDL (`railpulse_schema.sql`), and the Word project report.

**Method:**

1. Re-read the requirements and mapped each numbered requirement to evidence (Section 4).
2. **Executed the original DDL unchanged** in a real PostgreSQL 16.15 with pgvector 0.6.0 (installed for the audit), recording every error.
3. Wrote behavioural tests with hand-computed expected values for triggers, views, the stored function, constraints, cascade/restrict behaviour and vector search; ran them against the original, then the fixed schema.
4. Probed for integrity holes by attempting to insert contradictory or out-of-range rows inside rolled-back transactions.
5. Rendered the ER and UML diagrams and inspected them visually against notation standards.
6. Fixed confirmed defects in the source files, **re-ran every test on a fresh database**, regenerated diagrams, and patched the Word report so no delivered file contradicts another.

**Environment:** PostgreSQL 16.15, pgvector 0.6.0, Graphviz 2.43.0 (`neato` layout), Mermaid CLI with Chromium, pandoc 3.1.3, LibreOffice (for Word→PDF checks).

**What this audit could NOT do** (treat as unverified):

- Open the `.drawio` file in the draw.io application (its structure and XML validity were checked; the double-line edge style `shape=link` was applied but not visually confirmed).
- Open the Word report in Microsoft Word (checked via LibreOffice; the Table of Contents field is empty until updated in Word).
- Run any embedding model, or any code that does not exist (Next.js, API, auth).
- Measure performance at scale (all tests used a handful of rows).
- Check whether the project title is unique in the section, or inspect any Git repository.

---

## 4. Requirements compliance matrix

Status key as in Section 0. "SQL level" means proven in PostgreSQL; the brief also expects the *application* to use these features.

| # | Requirement (abridged) | Status | Evidence / gap |
|---|---|---|---|
| 1 | Unique title within section; real-world problem; not simple CRUD | OPEN | Title uniqueness unverified. Railway-delay tracking is a common student topic — see O10 |
| 2 | 2-member team; defined responsibilities for DB *and* app | NOT STARTED | No responsibility split documented |
| 3 | SQL (MySQL/PostgreSQL) + NoSQL or Vector DB | VERIFIED | PostgreSQL 16 + pgvector (Option 2) |
| 4 | ER diagram → relational schema; entities, attributes, PK, FK, relationships, constraints | VERIFIED / DESIGNED | ER and UML rendered; relational schema consistent with executed DDL |
| 4 | Vector component documented: data model, indexes, embeddings, metadata, retrieval | PARTIAL | Model, index (HNSW), metadata and retrieval query are VERIFIED at SQL level; embedding *generation* is NOT STARTED |
| 5 | DDL: CREATE, ALTER, DROP, PK/FK, constraints, indexes, views | VERIFIED | `railpulse_schema.sql` + ALTER/DROP in `railpulse_demo.sql` |
| 6 | DML: INSERT/UPDATE/DELETE/SELECT; JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | VERIFIED | `railpulse_demo.sql` (Q1–Q5 and DML blocks) |
| 7 | ≥ 4 advanced concepts | VERIFIED (SQL level) | Views, triggers, stored function, indexing, vector similarity, transactions — six demonstrated |
| 8 | Vector/semantic search: what is embedded, model, storage, metric, retrieval | PARTIAL | Embedded: `complaint_text`. Stored: `vector(384)`. Metric: cosine. Retrieval: `ORDER BY embedding <=> …`. Model (all-MiniLM-L6-v2, 384-d) is *named, never run* |
| 9 | Functional Next.js web interface | NOT STARTED | |
| 10 | Backend/API layer; credentials not hard-coded; env vars | NOT STARTED | |
| 11 | Authentication; ≥ 2 roles | PARTIAL | 3 roles exist in the schema (VERIFIED); no authentication or enforcement (O5) |
| 12 | Input validation at database level; integrity | VERIFIED | CHECK/UNIQUE/FK/composite FK/triggers; strengthened by this audit (D8) |
| 13 | Security: no plaintext passwords/credentials | PARTIAL | `password_hash` column exists; hashing code and env-var handling NOT STARTED |
| 14a | Documentation: problem statement, objectives, scope, functional requirements | DESIGNED | In the Word report (some text is future plans written in present tense — O11) |
| 14b | ER diagram, relational schema, DB choice + justification, data dictionary | VERIFIED / DESIGNED | Sections 2, Appendices A–E; Word report §5 |
| 14c | SQL/vector implementation, important queries | VERIFIED | Appendices B, C |
| 14d | System architecture | DESIGNED | Text only (Section 2.10); no architecture diagram |
| 14e | Application screenshots | NOT STARTED | No application |
| 14f | Testing results | PARTIAL | DB-level results in Section 6; application tests NOT STARTED |
| 14g | Conclusion and future enhancements | DESIGNED | In the Word report |
| 15 | Git/GitHub, per-member commits, README | NOT STARTED / unknown | |
| 16 | Demonstration contents | PARTIAL | Everything database-side is ready; Next.js UI, integration and per-member contribution are not |
| 17 | Originality | OPEN | See O10 |
| 18 | Beyond CRUD; justified DB choice | PARTIAL | DB side satisfies it (triggers, derived metrics, vector search, justification). Application side TBD |

---

## 5. Findings

### 5.1 Defects found in delivered artifacts — all FIXED and re-tested

| ID | Severity | Where | Defect | Evidence | Fix |
|---|---|---|---|---|---|
| D1 | **Critical** | DDL | `CREATE EXTENSION IF NOT EXISTS pgvector;` — the extension is named `vector`. Statement failed, `vector` type did not exist, so the `complaint` table and both its indexes were never created. | `ERROR: extension "pgvector" is not available`, then `type "vector" does not exist`, `relation "complaint" does not exist` ×2 | `CREATE EXTENSION IF NOT EXISTS vector;` |
| D2 | High | DDL trigger | Alert trigger fired on **every** UPDATE of a delayed row, creating duplicate alerts. | Two unrelated `UPDATE … SET platform_no` calls took the alert count from 1 to **3** | Fire on INSERT, or on UPDATE only when delay crosses the threshold from below (`OLD.delay_minutes < 30 AND NEW.delay_minutes ≥ 30`). Re-test: stays at 1 |
| D3 | High | DDL schema | `stop_event` times were `TIME`; a delay crossing midnight (23:50 → 00:20) computed **0** instead of 30 (negative interval clamped to 0). Also wrong for multi-day journeys. | Original: delay 0. Fixed: delay **30** | Columns changed to `TIMESTAMP` |
| D4 | High | DDL trigger | Delay was computed from arrival times only, so the **origin** stop (no arrival, only departure) always had delay 0. | Origin departing 90 min late recorded 0. Fixed: **90** | Use arrival pair if present, else departure pair |
| D5 | Medium | Views/function (consequence of D3, D4) | Reliability numbers were wrong: average 15.00 and 66.67% on-time where the truth was 55.00 and 0%. | Seen in the original test run | Resolved by D3, D4. Re-test: avg 42.00 over 5 stops, on-time 20% (matches hand computation) |
| D6 | Medium | DDL comment | Documented example `sp_train_delay_report(12951)` returns **0 rows**: the argument is the internal `train_id`, but 12951 is a train *number*. | 0 rows | Corrected example + lookup-by-number example in the file; Word report updated |
| D7 | High (silent) | DDL index | `ivfflat (lists = 100)` created on an empty table with default `probes = 1` **silently omitted rows**: a 3-row table returned 2 rows, no error. Would have corrupted the live demo. | Plan used the index; `probes=100` and an exact scan both returned 3 | Replaced with **HNSW** (`vector_cosine_ops`): no training step, correct from an empty table. Re-test: 3 rows, correct order |
| D8 | Medium | DDL constraints | Three validation holes: (a) a complaint could reference train 2 and a journey of train 1; (b) `sentiment_score = 5.0` accepted though the documented range is −1..1; (c) `delay_minutes = -5` accepted. | All three inserts succeeded before the fix | (a) `UNIQUE (journey_id, train_id)` on `journey` + composite FK `(journey_id, train_id)` on `complaint` (skipped when `journey_id` is NULL); (b) `CHECK (sentiment_score BETWEEN -1 AND 1)`; (c) `CHECK (delay_minutes >= 0)`. Re-test: 3 rejected, valid rows still accepted |
| D9 | Low | DDL hygiene | Redundant index `idx_journey_train_date` duplicated the UNIQUE index; trigger function `fn_stop_event_after_insert` actually served a BEFORE trigger and held an unused variable. | Code review | Index removed; function renamed `fn_stop_event_compute_delay` |
| D10 | Medium | UML | Members written like `+int zone_id (PK)` contain parentheses, so Mermaid drew every key as a *method*. `originates_at`/`terminates_at` arrows pointed STATION→TRAIN (reversed). Attribute name `embedding_ref` ≠ DDL `embedding`; `time` shown where DDL now uses `timestamp`. | Visual inspection of the rendered PNG | Parentheses removed; arrows reversed to TRAIN→STATION; names/types aligned. Re-rendered and inspected |
| D11 | Medium | Chen ER | Total participation was drawn as a thick line (Chen: **double line**); derived attributes were not dashed; `embedding` was missing entirely. | Visual inspection | 22 total-participation edges → double line; `delay_minutes`, `sentiment_score`, `embedding` → dashed ellipses; `embedding` added. Re-rendered and inspected |
| D12 | Low | Word report | Stale or unsupported statements: "configurable threshold" (it is a constant 30), IVFFlat references, a "sub-second" retrieval claim that was never measured, an outdated notation key, the broken function example, `TIME` types for `stop_event`. | Text review | All patched in place; report re-rendered and the changed pages inspected |
| D13 | Low | draw.io export | The converter dropped double lines (all 68 edges were single strokes). | XML inspection | 22 edges tagged with draw.io's `shape=link` (double-line) style. *Not visually confirmed in draw.io* |

A unified diff of the DDL changes is in Appendix F.

### 5.2 Open findings — NOT fixed; each needs a decision

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| O1 | **High** | **No application layer.** Requirements 9, 10, 11, 13, 14e, 15, 16 depend on it. | Section 7 roadmap |
| O2 | **High** | **No data source.** Only 3 stations / 2 trains of illustrative data exist. Reliability analytics and vector search need volume to be meaningful. No public data source or its terms of use were verified in this audit. | Decide: synthetic generator (full control, recommended) and/or imported data *only if its licence/terms allow*. Generator should include multi-day trains and midnight crossings |
| O3 | Medium | `stop_event.station_id` is **not** forced to match the scheduled `route_stop` station for that `seq_no` (test G4 accepted a mismatch). Deliberate: real trains are diverted or make unscheduled stops (the schema even has a `ROUTE_CHANGE` alert type), so a hard constraint would reject legitimate data. | Keep unconstrained; add a diagnostic view that lists mismatches |
| O4 | Medium | `route_stop` times are `TIME` with no day offset, so a train's 2nd-day stops lose "day N" information. | Add `day_offset SMALLINT NOT NULL DEFAULT 0` to `route_stop` |
| O5 | Medium | Authorisation exists only as a planned application feature. No database roles, `GRANT`s, or row-level security. | Enforce in the API layer at minimum; optionally add PostgreSQL roles/RLS as an advanced feature |
| O6 | Medium | **Embedding model not chosen/integrated.** Column is fixed at `vector(384)`; switching to a model with another dimension requires `ALTER`. `category` and `sentiment_score` have no defined source (manual? model? rule?). | Pick the model, document the dimension, write the embedding step; define how category/sentiment are produced |
| O7 | Low | Alert threshold is a constant (30) inside the trigger function; no settings table. | Optional `settings` table, or state clearly that it is fixed |
| O8 | Low | Early arrivals are clamped to 0 delay, so "running early" cannot be analysed. | Acceptable for a reliability metric; document it |
| O9 | Low | `train_type`, `role`, `category`, `alert_type`, `run_status` are CHECK lists, not lookup tables. | Acceptable; adding a value needs `ALTER TABLE` |
| O10 | Medium | **Originality risk.** The brief requires substantially different problem statements/features among teams in similar domains. Railway-delay tracking is a likely overlap; this audit cannot see other teams' projects. | Differentiate on the unusual parts: delay-reliability scoring plus semantic complaint analytics. Be ready to explain the design decisions in Section 9 |
| O11 | Medium | Word report: Table of Contents is empty until updated in Word; team-member and course placeholders unfilled; several sections (JWT sessions, Next.js route handlers, testing plan) describe things **not yet built** in the present tense; title-page date reads September 2026. | Update the TOC, fill placeholders, reword plan sections or finish the features before submission |
| O12 | Low | No performance benchmark; HNSW parameters are defaults. | Benchmark only if scale claims are made |
| O13 | Info | Controlled redundancy (Section 2.8): scheduled times duplicated in `stop_event`; `delay_minutes` stored though derivable. | Explain as intentional in the viva |

### 5.3 Checked and found correct

- CHECK/UNIQUE rejections for: `train` with source = destination; an invalid `train_type`; a duplicate `(train_id, journey_date)`; an invalid `role`; a negative `distance_km`.
- `ON DELETE RESTRICT` blocks deleting a zone that stations still reference.
- `ON DELETE CASCADE` from `journey` removes its `stop_event` rows and `alert` rows (both counts went to 0).
- Weak-entity composite primary keys behave as designed.
- `vector(384)` rejects a 3-element vector (`expected 384 dimensions, not 3`).
- Cosine-distance ordering is correct: identical = 0.0000, near-duplicate ≈ 0.0000, unrelated = 0.2610 in the test.
- BEFORE trigger computes delay before the AFTER trigger reads it (alerts used the computed value).
- Early arrival (10 min early) clamps to 0 and raises no alert.

---

## 6. Verification evidence

### 6.1 Original schema (before fixes)

| Test | Expected | Observed | Result |
|---|---|---|---|
| Load DDL | 9 tables | `pgvector` extension error; `complaint` + 2 indexes missing | FAIL (D1) |
| 45-min late arrival | delay 45, 1 alert | delay 45, 1 alert | pass |
| 2 unrelated UPDATEs | still 1 alert | **3 alerts** | FAIL (D2) |
| Origin departs 90 min late | delay 90 | **0** | FAIL (D4) |
| 23:50 → 00:20 next day | delay 30 | **0** | FAIL (D3) |
| `sp_train_delay_report(12951)` | rows | **0 rows** | FAIL (D6) |
| Views after the above | avg 55.00, 0% on-time | avg **15.00**, **66.67%** | FAIL (D5) |
| 5 bad inserts (CHECK/UNIQUE) | 5 errors | 5 errors | pass |

### 6.2 Final schema

| Test | Expected (hand-computed) | Observed | Result |
|---|---|---|---|
| Load DDL | exit 0, 9 tables, 2 views, 2 triggers | exit 0, 9 / 2 / 2, no errors or warnings | pass |
| T1: 45-min late arrival | delay 45, alerts 1 | 45, 1 | pass |
| T2: two unrelated UPDATEs | alerts stay 1 | 1 | pass |
| T3: origin departs 90 late | delay 90, alerts 2 | 90, 2 | pass |
| T4: 23:50 → 00:20 | delay 30, alerts 3 | 30, 3 | pass |
| T4b: arrives 10 min early | delay 0, no alert | 0, 3 | pass |
| T4c: 10 → 40 min by UPDATE, then updated again | +1 alert only | 4 total | pass |
| T5: `sp_train_delay_report(1)` | one row, avg 42.00, max 90 | 42.00 / 90 | pass |
| T6: `vw_train_reliability` | 5 stops, avg 42.00, 20.00% on-time | 5 / 42.00 / 20.00 | pass |
| T7: 5 invalid inserts | 5 errors | 5 errors | pass |
| T8: delete zone in use | FK error | FK error | pass |
| T9: nearest to complaint A | A, near-duplicate B, unrelated C | 0.0000, 0.0000, 0.2610 — all 3 rows | pass |
| T9b: 3-element vector | error | `expected 384 dimensions, not 3` | pass |
| T10: delete journey | stop_events and alerts → 0 | 0, 0 | pass |
| G1: complaint train ≠ journey's train | rejected | FK violation | pass |
| G2: sentiment 5.0 | rejected | CHECK violation | pass |
| G3: delay −5 | rejected | CHECK violation | pass |
| Valid complaint with matching journey; valid complaint with no journey | accepted | both `INSERT 0 1` | pass |

### 6.3 `railpulse_demo.sql` (run on a fresh schema; exit code 0; only the 2 deliberate errors fired)

| Block | Expected | Observed |
|---|---|---|
| Auto-computed delays | 0, 90, 15, 30, 0, 5; 2 alerts (90 and 30) | matches |
| Q1: trains averaging > 20 min (JOIN/GROUP BY/HAVING/ORDER BY) | train 12627, avg 33.8, 4 stops | matches |
| Q2: stations by average delay (view) | New Delhi 60.00 first | matches |
| Q3: journeys worse than network average 23.33 (subquery) | journey 1 only | matches |
| Q4: complaints most similar to #1 (vector) | #2 then #3 | matches |
| Q5: stored function by train number | 2026-10-01 avg 45.00; 2026-10-02 avg 22.50 | matches |
| UPDATE actual arrival (30 → 60 min) | delay 60, alerts still 2 | matches |
| Transaction with SAVEPOINT | status RUNNING kept; bad insert rolled back; 0 `HACKER` users | matches |
| DELETE complaint | 2 remain | matches |
| ALTER TABLE ADD COLUMN / ADD CONSTRAINT, then rejected `'ABC'` train number; DROP CONSTRAINT / COLUMN / INDEX / VIEW | schema restored | matches |

---

## 7. Remaining-work roadmap (priority order)

For a 2-member team. Suggested split: one member owns data + database + embedding pipeline + DB tests; the other owns Next.js UI + API + auth. Both must contribute to *both* database and application work (requirement 2), so cross-assign at least one task each.

1. **Data (O2).** Write a seed generator: zones, ~20–50 stations, ~10–20 trains with ordered `route_stop`s (include multi-day trains), several weeks of journeys, `stop_event`s with realistic delay distributions (some midnight crossings), ~100–300 complaints in the categories. *Acceptance:* dashboards show non-trivial rankings; a vector query returns visibly related complaints.
2. **Embedding pipeline (O6).** Choose the model; embed `complaint_text` on insert; set `category`/`sentiment_score` by a defined rule. Dimension must equal 384 or `ALTER` the column. *Acceptance:* two paraphrased complaints are nearer than two unrelated ones.
3. **API layer (Next.js Route Handlers).** Suggested endpoints: `POST /api/auth/login`; `GET /api/trains`; `GET /api/trains/:id/reliability`; `GET /api/stations/ranking`; `GET /api/journeys?train=&from=&to=`; `POST /api/complaints`; `GET /api/complaints/:id/similar`; admin CRUD under `/api/admin/{zones,stations,trains,routes}`. Parameterised SQL only; credentials from `.env`.
4. **Authentication and roles (O5).** Hash passwords (bcrypt/argon2); signed session in an HTTP-only cookie; server-side role checks on every write route.
5. **UI.** Login; reliability dashboard; train detail with delay history; station ranking; complaint form; "similar complaints" search; alerts list; admin master-data screens.
6. **Tests.** Convert `railpulse_demo.sql`/the test matrix into an automated DB test; add API and role tests; capture screenshots (required documentation item).
7. **Documentation pass (O11).** Update the Word report: replace plan-tense statements, add screenshots and test results, fill names, update the TOC, add an architecture diagram.
8. **Git hygiene.** `.gitignore` including `.env`; `.env.example`; README with setup and run steps; commits that show each member's contribution.
9. **Optional DB improvements:** O3 diagnostic view, O4 `day_offset`, O7 settings table, O5 PostgreSQL roles/RLS.

---

## 8. Invariants — rules code must obey (for Codex)

1. **Never write `stop_event.delay_minutes` from application code.** The BEFORE trigger computes it from the timestamp pairs. Supply the four timestamps only.
2. **Never create alerts from application code.** The AFTER trigger does it, once per threshold crossing (threshold = 30, constant).
3. **`stop_event` times are `TIMESTAMP`; `route_stop` times are `TIME`.** Do not "simplify" `stop_event` back to `TIME` — it breaks midnight and multi-day logic (D3).
4. **`stop_event` and `route_stop` are weak entities**: always address them with the composite key `(journey_id, seq_no)` / `(train_id, seq_no)`.
5. **`train_id` ≠ `train_number`.** `train_id` is the internal serial key; `train_number` is the public number such as `'12627'`. `sp_train_delay_report` takes `train_id`.
6. **Embeddings are `vector(384)` with cosine distance (`<=>`) and an HNSW index.** Do not switch to IVFFlat without rebuilding it on real data and setting `ivfflat.probes` (D7).
7. **A complaint's `train_id` must match its journey's train** (composite FK). If `journey_id` is NULL the check is skipped; that is intended.
8. **`sentiment_score` ∈ [−1, 1]**, `delay_minutes ≥ 0`, enforced by CHECK. Do not rely on the UI alone.
9. **Roles are exactly `ADMIN`, `ANALYST`, `COMMUTER`.** Store only password hashes in `password_hash`.
10. **Never hard-code credentials**; read DB configuration from environment variables.
11. **Run `railpulse_schema.sql` then `railpulse_demo.sql` on an empty database** to reproduce the verified state. The demo assumes an empty schema.
12. Seed/sample data in the demo is **illustrative**, not real timetable data. Do not present it as real.

---

## 9. Viva preparation — likely questions

| Question | Short answer grounded in this design |
|---|---|
| Why a weak entity for `route_stop`/`stop_event`? | A stop number is meaningless without its train/journey; the composite key `(owner_id, seq_no)` expresses that dependency, and cascade-delete keeps children consistent. |
| Why `TIMESTAMP` in `stop_event` but `TIME` in `route_stop`? | A timetable repeats daily (time of day); an actual event happens at a specific moment and can cross midnight. Test D3 shows `TIME` computed 0 delay for 23:50→00:20. |
| Why compute delay in a trigger instead of the app? | One authoritative rule; the app cannot write an inconsistent value; every client (SQL console, API, import script) gets it. |
| Is the schema normalised? | Essentially 3NF, with two deliberate exceptions: a schedule snapshot in `stop_event` and a stored derived `delay_minutes` (Section 2.8). |
| Why HNSW, not IVFFlat? | We tested it: IVFFlat built on an empty table with default `probes` returned 2 of 3 rows silently. HNSW needs no training and returned all 3 (D7). |
| What is partial participation here? | `complaint` → `journey`: a complaint may concern a train in general. Drawn as a single line; every other link is total (double line). |
| How do you prevent a complaint contradicting its journey? | Composite foreign key `(journey_id, train_id)` to `journey`; found as gap G1 in this audit. |
| Where are transactions shown? | `railpulse_demo.sql`: an update kept while a failing insert is rolled back to a savepoint. |
| Why SQL + vector, not MongoDB? | Section 2.4: structured relational data plus one text-heavy column that needs semantic search; pgvector keeps both in one transactional store. |
| What happens if a journey is deleted? | `ON DELETE CASCADE` removes its stop events and alerts (verified T10). |

---

## Appendix A — Relational schema (final)

{{INCLUDE:/home/claude/work/relational_schema.md:markdown-noheader}}

### A.1 Final column-level data dictionary

| Table | Column | Type | Constraints |
|---|---|---|---|
| zone | zone_id | SERIAL | PK |
| zone | zone_code | VARCHAR(5) | NOT NULL, UNIQUE |
| zone | zone_name | VARCHAR(80) | NOT NULL |
| zone | headquarters | VARCHAR(80) | NOT NULL |
| station | station_id | SERIAL | PK |
| station | station_code | VARCHAR(10) | NOT NULL, UNIQUE |
| station | station_name | VARCHAR(100) | NOT NULL |
| station | city, state | VARCHAR(80) | NOT NULL |
| station | zone_id | INTEGER | NOT NULL, FK → zone, ON DELETE RESTRICT |
| train | train_id | SERIAL | PK |
| train | train_number | VARCHAR(10) | NOT NULL, UNIQUE |
| train | train_name | VARCHAR(100) | NOT NULL |
| train | train_type | VARCHAR(30) | NOT NULL, CHECK in (Rajdhani, Shatabdi, Express, Superfast, Passenger, MEMU, Vande Bharat) |
| train | source_station_id, destination_station_id | INTEGER | NOT NULL, FK → station; CHECK source ≠ destination |
| route_stop | train_id | INTEGER | PK part, FK → train, ON DELETE CASCADE |
| route_stop | seq_no | INTEGER | PK part (partial key) |
| route_stop | station_id | INTEGER | NOT NULL, FK → station |
| route_stop | scheduled_arrival, scheduled_departure | TIME | nullable |
| route_stop | distance_km | NUMERIC(7,2) | NOT NULL, CHECK ≥ 0 |
| route_stop | halt_minutes | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 |
| journey | journey_id | SERIAL | PK |
| journey | train_id | INTEGER | NOT NULL, FK → train |
| journey | journey_date | DATE | NOT NULL; UNIQUE (train_id, journey_date); UNIQUE (journey_id, train_id) |
| journey | run_status | VARCHAR(20) | NOT NULL, DEFAULT 'SCHEDULED', CHECK in (SCHEDULED, RUNNING, COMPLETED, CANCELLED) |
| stop_event | journey_id | INTEGER | PK part, FK → journey, ON DELETE CASCADE |
| stop_event | seq_no | INTEGER | PK part (partial key) |
| stop_event | station_id | INTEGER | NOT NULL, FK → station |
| stop_event | scheduled_arrival, actual_arrival, scheduled_departure, actual_departure | TIMESTAMP | nullable |
| stop_event | delay_minutes | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0; **computed by trigger** |
| stop_event | platform_no | VARCHAR(10) | nullable |
| user_account | user_id | SERIAL | PK |
| user_account | full_name | VARCHAR(100) | NOT NULL |
| user_account | email | VARCHAR(120) | NOT NULL, UNIQUE |
| user_account | password_hash | VARCHAR(255) | NOT NULL (hash only) |
| user_account | role | VARCHAR(20) | NOT NULL, DEFAULT 'COMMUTER', CHECK in (ADMIN, ANALYST, COMMUTER) |
| complaint | complaint_id | SERIAL | PK |
| complaint | user_id | INTEGER | NOT NULL, FK → user_account |
| complaint | train_id | INTEGER | NOT NULL, FK → train |
| complaint | journey_id | INTEGER | nullable; composite FK (journey_id, train_id) → journey |
| complaint | complaint_text | TEXT | NOT NULL |
| complaint | category | VARCHAR(30) | nullable, CHECK in (DELAY, CLEANLINESS, SAFETY, STAFF, CATERING, OTHER) |
| complaint | sentiment_score | NUMERIC(4,3) | nullable, CHECK between −1 and 1 |
| complaint | embedding | vector(384) | nullable; HNSW index, cosine |
| complaint | created_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| alert | alert_id | SERIAL | PK |
| alert | journey_id | INTEGER | NOT NULL, FK → journey, ON DELETE CASCADE |
| alert | alert_type | VARCHAR(30) | NOT NULL, CHECK in (DELAY, CANCELLATION, ROUTE_CHANGE) |
| alert | message | VARCHAR(255) | NOT NULL |
| alert | threshold_minutes | INTEGER | nullable |
| alert | created_at | TIMESTAMP | NOT NULL, DEFAULT now() |

---

## Appendix B — Final DDL (`railpulse_schema.sql`, executed and verified)

{{INCLUDE:/home/claude/work/railpulse_schema.sql:sql}}

---

## Appendix C — Demo and test script (`railpulse_demo.sql`, executed and verified)

{{INCLUDE:/home/claude/work/railpulse_demo.sql:sql}}

---

## Appendix D — UML class diagram (Mermaid source, corrected)

Rendered image: `RailPulse_UML_ClassDiagram.png`

![UML class diagram](RailPulse_UML_ClassDiagram.png)

{{INCLUDE:/home/claude/work/uml_class.mmd:mermaid}}

---

## Appendix E — Chen ER diagram

Rendered image: `RailPulse_Chen_ERD.png` (editable draw.io copy: `RailPulse_Chen_ERD.drawio`)

![Chen ER diagram](RailPulse_Chen_ERD.png)

**Notation key used in this diagram**

| Symbol | Meaning |
|---|---|
| Rectangle | Entity |
| Double rectangle | Weak entity (`route_stop`, `stop_event`) |
| Diamond | Relationship |
| Double diamond | Identifying relationship (`has_stop`, `has_event`) |
| Ellipse | Attribute |
| Underlined ellipse | Primary key (or partial key, shown in gold, for weak entities) |
| Dashed ellipse | Derived attribute (`delay_minutes`, `sentiment_score`, `embedding`) |
| Double line | Total participation |
| Single line | Partial participation (only `complaint`–`related_to`–`journey`) |
| `1` / `N` | Cardinality labels on the relationship edges |

**Graphviz DOT source** (render with `neato -Tpng RailPulse_ChenERD_source.dot -o RailPulse_Chen_ERD.png`):

{{INCLUDE:/home/claude/work/chen_erd.dot:dot}}

---

## Appendix F — DDL changes: original → final (unified diff)

{{INCLUDE:/home/claude/work/ddl_changes.diff:diff}}

---

## Appendix G — File inventory

| File | Purpose | Status |
|---|---|---|
| `RailPulse_Audit_Report.md` / `.pdf` | This report | Authoritative |
| `railpulse_schema.sql` | Final DDL | VERIFIED — authoritative |
| `railpulse_demo.sql` | Seed data, DML, queries, transaction, ALTER/DROP | VERIFIED |
| `RailPulse_UML_Code.txt`, `RailPulse_UMLClassDiagram_source.mmd` | Mermaid source (identical) | Corrected |
| `RailPulse_UML_ClassDiagram.png` | Rendered UML | Corrected |
| `RailPulse_ChenERD_source.dot` | Graphviz source of the Chen ER | Corrected |
| `RailPulse_Chen_ERD.png` | Rendered Chen ER | Corrected |
| `RailPulse_Chen_ERD.drawio` | Editable draw.io copy | Corrected; double-line style not visually confirmed |
| `relational_schema.md`, `RailPulse_Relational_Schema.txt`, `RailPulse_Relational_Schema.docx` | Relational schema in three formats | Updated for composite FK |
| `RailPulse_Project_Report.docx` | Word project report (12 pages) | Patched for consistency; see O11 |

## Appendix H — Reproduce the audit

```bash
# 1. PostgreSQL 16 with pgvector available (extension name: vector)
createdb railpulse
psql -d railpulse -v ON_ERROR_STOP=1 -f railpulse_schema.sql   # expect exit 0, no errors
psql -d railpulse -f railpulse_demo.sql                         # expect exactly 2 deliberate ERROR lines
# 2. Diagrams
neato -Tpng RailPulse_ChenERD_source.dot -o RailPulse_Chen_ERD.png
mmdc -i RailPulse_UMLClassDiagram_source.mmd -o RailPulse_UML_ClassDiagram.png
```