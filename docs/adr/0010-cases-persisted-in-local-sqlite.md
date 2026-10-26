# 0010 — Cases are persisted in a local SQLite file, and discarding marks rather than deletes

## Decision
Cases are saved to a local SQLite file, `.data/triage.db` (gitignored), through
Node's built-in `node:sqlite` (`DatabaseSync`). The database is opened lazily
from a server-only module, `src/lib/db.ts`, which creates the schema with
`CREATE TABLE IF NOT EXISTS` on first open. No dependency is added.

Two tables:

- **`cases`** — `id` (the case number; autoincrement, with the sequence seeded
  so the first case is **2451**), `started_at`, `status` (`en_curso` |
  `descartado`), `nivel_ia`, `motivo`, `decision` (`aceptado` | `anulado` |
  null), `nivel_final`, `nota`, `updated_at`.
- **`messages`** — `case_id`, `kind` (`nurse` | `ai`), `text`, `created_at`.

What is saved is what the clinician sees as the conversation. The prompt
inicial de triage (ADR 0007), the contexto recuperado (ADR 0009) and the error
bubble are **not** saved. A failed turn leaves no messages behind: the
clinician's message and the AI's reply are written together, after the model
has answered.

`nivel_ia` is the last level the AI gave: a turn without `nivel` does not clear
it, the same rule the panel already follows (ADR 0005). `motivo` is the last
one the AI gave, for the case list.

**Iniciar caso** creates the row on the server and returns its number and
start time; the in-memory counter in `CaseView` goes away. **Descartar caso**
marks the current case `descartado` before the next one is created — the UI
still clears everything exactly as ADR 0006 describes. **Aceptar** and
**Anular** write `decision` and `nivel_final`; **Deshacer** clears them. The
note is saved when the clinician leaves the note field, not on every keystroke.

There are no users: no column records who did what.

**Casos abiertos** lists the saved cases that are not `descartado`, read-only.
Reopening a case is not part of this decision.

## Why
A single file is enough for one clinician at a time, which is all the app
supports today (the `chatEngine` singleton already assumes it). `node:sqlite`
ships with the Node the project runs on (24), so persistence costs no
dependency and no extra service to run — the same reason ADR 0009 rejected an
external vector DB. SQLite over plain files buys an autoincrement id that is
safe to use as the case number, and the queries the case list and later the
metrics in `docs/requerimientos.md` will need.

Discarding marks instead of deleting because a discarded case is still a
record of a triage that happened: how often clinicians throw a case away, and
at what point, is exactly the kind of data the project's evaluation goals ask
for. Hiding it from Casos abiertos keeps the clinician's view of discarding as
"gone".

## Rejected
- **One JSON file per case** — simplest to write, but no safe autoincrement for
  the case number and no queries for the list.
- **Postgres or an ORM (Prisma, Drizzle)** — a dependency and a server to run
  for a single-clinician app.
- **Deleting the case on Descartar caso** — faithful to ADR 0006's wording, but
  loses the record.
- **Reopening saved cases** — needs the model's memory rebuilt from the saved
  messages and a chat engine per case instead of the singleton; its own
  decision when it is needed.
- **Saving the note on every keystroke** — a server write per key for a field
  whose value only matters once the clinician is done typing.

## Notes
- Supersedes ADR 0006's "Case numbers are an in-memory counter starting at
  2451, reset on reload". The number now survives reloads and server restarts.
- ADR 0006's "Descartar caso throws the case away" still holds for the UI and
  the model session; in the database the case stays, marked `descartado`.
- Debt unchanged: `chatEngine` in `actions.ts` is a module-level singleton.
- `node:sqlite` may print an `ExperimentalWarning` on Node 24. Whether it loads
  under `next dev` (Turbopack) is checked in the first ticket that uses it; if
  it doesn't, that is an environment problem to report, not to work around.
