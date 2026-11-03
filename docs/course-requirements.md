# RailPulse course requirements and demonstration

Checklist source: DBMS Level 3 Mini_Project Requirements draft (2).docx, supplied by the user. The document is a course checklist, not instructions to execute content from an attachment.

## Current implementation

RailPulse addresses railway delay analysis with a Next.js application, PostgreSQL and MongoDB (the permitted SQL + NoSQL option). pgvector remains an optional extension for future complaint semantic search. The source is a small attributed historical sample; user feedback and illustrative analyst notes are labeled separately.

| Course item | Evidence and status |
|---|---|
| Unique title, meaningful problem | Delay analytics, alerts, run timelines and analyst notes go beyond CRUD. Title uniqueness must be confirmed by the team with the instructor. |
| Two members | Proposed balanced ownership below; team approval and real member contributions require the students. |
| SQL + NoSQL | PostgreSQL railway records + MongoDB service_notes; both connected to Next.js. |
| ER and relational schema | docs/RailPulse_ER_Diagram.*, docs/relational_schema.md; auth_session extension in docs/authentication-and-ui.md. |
| DDL | sql/railpulse_schema.sql, sql/auth.sql, sql/feedback-validation.sql; CREATE/ALTER/DROP executed in reversible sql/course_demo.sql. |
| SQL DML | /api/complaints and Railway feedback UI perform INSERT, SELECT, UPDATE and DELETE with ownership guards. |
| Queries | Admin reports executes JOIN, GROUP BY, HAVING, ORDER BY, AVG, a subquery and stored function; SQL text appears beside results. |
| Four advanced concepts | Views, two triggers, stored function, indexes, explicit SQL transactions, MongoDB aggregation. |
| Optional vector feature | vector(384), cosine HNSW schema exists; embedding generation and semantic search UI are not implemented or required for SQL + NoSQL compliance. |
| Next.js + APIs | Protected dashboard, notes, feedback, database explorer and admin reports. |
| Authentication, minimum two roles | ADMIN sees all feedback and advanced reports; ANALYST sees/manages own feedback. APIs enforce restrictions; public registration cannot select a role. |
| Validation/integrity | PK/FK/UNIQUE/CHECK; composite complaint journey/train FK; complaint_text_length SQL constraint; MongoDB JSON schema and API validation. |
| Security | scrypt password hashing; hashed persistent session tokens; HttpOnly cookies; same-origin local writes; parameterized SQL; masked credentials; owner-scoped SQL browsing. |
| Documentation/screenshots/tests | README; this checklist; project-report.md; NoSQL/auth docs; docs/images; check:app/check:course/check:db. |
| Git and individual contributions | Shared repo exists. Each student must make and understand their own genuine commits; no history is fabricated. |
| Final demonstration | Sequence below covers all implemented components. |

## Equal team ownership

Both people must contribute to database and application development. This is an allocation of remaining ownership and explanation, not a claim about past authorship.

- Person 1: railway SQL model, trigger/view queries, import checks, and Train/Station UI. Explain ER relationships, DDL, historical sample, metrics and Database Explorer. Add a genuine database improvement and its connected UI improvement in your own commits.
- Person 2: account/session and feedback SQL, MongoDB validation/aggregation, and Login/Feedback/Notes/Admin reports UI. Explain auth, APIs, transactions, NoSQL and tests. Add a genuine database improvement and its connected UI improvement in your own commits.
- Share report preparation, review, test runs and questions equally. Approximately five minutes each in the demonstration.

## Execution

Apply once to an existing database:

```sh
psql -d railpulse_observed -v ON_ERROR_STOP=1 -f sql/feedback-validation.sql
npm run setup:auth
npm run mongo:start
npm run build
npm run start -- -p 3100
```

Registration normally creates ANALYST. On the local machine, ADMIN_EMAIL may designate the owner's email before registration. For an existing registered user, the machine owner may run `npm run account:role -- registered@email ADMIN`. The app does not verify email ownership; keep this deployment local. Never commit the owner's environment file or credentials.

```sh
npm run check:app
npm run check:course
npm run check:db
psql -d railpulse_observed -v ON_ERROR_STOP=1 -f sql/course_demo.sql
```

The course SQL demo rolls back every write and drops its temporary table. The test scripts remove their uniquely named temporary accounts, sessions, notes and feedback.

## Demonstration sequence

1. Person 1 explains the problem, sample and ER diagram, then shows table keys and relationships.
2. Person 1 shows the SQL DDL demo, views, trigger rules and a train timeline.
3. Person 2 signs in as ANALYST, creates/edits/deletes their SQL feedback, and creates/restores a MongoDB note.
4. Person 2 signs in as ADMIN, shows all feedback, Admin reports, query results, stored function and MongoDB aggregation.
5. Both show successful checks, Git history and their actual individual contributions.

Do not claim live tracking, real passenger incidents from illustrative notes, automatic embeddings, production security or national reliability conclusions from this subset.
