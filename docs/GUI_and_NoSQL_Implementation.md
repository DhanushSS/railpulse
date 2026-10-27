# RailPulse GUI and NoSQL implementation

## What runs now

The Next.js GUI has a [reliability dashboard](../app/page.tsx) and a [Service Notes screen](../app/notes/page.tsx). The dashboard reads PostgreSQL reliability views, station rankings, and delay alerts. The Service Notes screen lets a local user add and filter observations. Its API lives at [`../app/api/notes/route.ts`](../app/api/notes/route.ts).

The NoSQL database is **MongoDB 8**, with a `railpulse.service_notes` document collection. Notes are separate from the PostgreSQL `complaint` table and are not passenger complaints. PostgreSQL remains authoritative for trains, journeys, stop events, delays, and alerts. MongoDB stores flexible analyst observations linked by the public `train_number` (and optionally `station_code`). The write API checks those codes in PostgreSQL before insertion.

Example document:

```json
{
  "train_number": "22160",
  "category": "DELAY_REVIEW",
  "note": "The two sampled runs have high stop delays. Review more dates before drawing a broader reliability conclusion.",
  "tags": ["sample", "review"],
  "source": "illustrative_seed",
  "details": {"sample_runs": 2, "basis": "historical sample dashboard"},
  "created_at": "2026-10-27T00:00:00.000Z"
}
```

`details` can hold additional fields without changing the SQL schema. MongoDB validates required fields, categories, text length, and tag limits. Two indexes support finding recent notes by train or category. The setup script inserts two clearly labeled illustrative notes and is safe to rerun without duplicating them.

## Run locally

1. Install PostgreSQL with pgvector and MongoDB Community Server 8. Configure the RailPulse PostgreSQL database as described in the [README](../README.md).
2. Add `MONGODB_URI=mongodb://127.0.0.1:27017` and `MONGODB_DB=railpulse` to `.env.local`.
3. Run `npm run mongo:start`, then `npm run setup:mongo`.
4. Run `npm run dev` and open `/` and `/notes`.

The MongoDB start script binds to `127.0.0.1` and stores database files in `.local/mongodb` inside the checkout. If a MongoDB server already listens on port 27017, the script leaves it running. `.local/` and `.env.local` are ignored by Git.

## API and boundaries

- `GET /api/notes?train=22160&category=DELAY_REVIEW` returns up to 50 recent documents.
- `POST /api/notes` accepts a train number, category, 10–1000 character note, optional station code, and up to five short tags. It accepts browser requests only from a matching localhost origin.
- No login or role enforcement is implemented. This is a **local demonstration**; do not expose the write API as a public service until authentication and authorization are added.
- Seed notes are illustrative analysis examples, not verified incident reports. The historical railway observations remain in PostgreSQL and are labeled as historical, not live.
