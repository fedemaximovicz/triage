# 21 — Cases and their conversation are saved

Blocked by: —
Status: done

## Goal
Every case the clinician starts is saved in a local SQLite file, with the
conversation as they see it. The case number comes from the database, so it
survives reloads and server restarts. **Descartar caso** leaves the old case
saved and marked `descartado`. Nothing new appears in the UI.

## Acceptance
- `src/lib/db.ts` opens `.data/triage.db` with `node:sqlite` on first use,
  creating the folder, the `cases` and `messages` tables (ADR 0010) and the
  seeded sequence if they don't exist. `/.data/` is in `.gitignore`.
- **Iniciar caso** creates the case row on the server; the header shows the
  number and start time the server returned. The first case in an empty
  database is #2451; after a reload or a server restart the next case
  continues the sequence instead of starting over.
- The case row exists before the opening turn goes out, so a failed opening
  turn still leaves a started case (ADR 0007) — saved, with no messages.
- The AI's opening reply is saved as an `ai` message. The prompt inicial is
  never saved.
- Each successful clinician turn saves the clinician's text as a `nurse`
  message and the AI's prose as an `ai` message, in that order, together. A
  failed turn saves nothing; the error bubble is never saved.
- The contexto recuperado and the instructed message (ADR 0003's appended
  instructions) are never saved — the `nurse` row holds the clinician's raw
  text.
- Each turn whose recommendation carries `nivel` updates `nivel_ia`; one with
  `motivo` updates `motivo`. A turn without them leaves the saved values as
  they were.
- **Descartar caso** marks the current case `descartado` before the new case
  is created. Its messages stay.
- The UI behaves exactly as today otherwise: same empty state, same thread,
  same panel, same discard dialog.
- With the server running, `.data/triage.db` can be inspected (e.g.
  `node -e` with `node:sqlite`) and shows the cases, their status and their
  messages.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0010 is the decision record; it supersedes ADR 0006's in-memory counter.
  `FIRST_CASE_NUMBER` and `nextCaseNumber` in `CaseView` go away.
- Creating the case and running the opening turn are two steps, not one
  server action: if they were one, a failed model call would lose the number
  the server just assigned. A likely shape is a `createCase(discardId?)`
  action that returns `{ number, startedAt }`, then the existing opening turn
  with that number. Propose the exact shape in the plan.
- `chat()` needs to know which case a turn belongs to — today it takes only
  the text. The `chatEngine` singleton stays (debt noted in ADR 0010).
- ADR 0006's chaining still holds: the model session reset happens before the
  prompt inicial goes out. Ticket 19's index warming stays alongside it.
- Ticket 13 (Reintentar) is still open. It should be able to re-send the
  opening turn for an existing case without creating a new row; keep that
  possible, don't build it here.
- First thing to check: that `node:sqlite` loads in a server action under
  `next dev`. An `ExperimentalWarning` in the console is expected and fine. If
  it doesn't load, STOP and report — no workaround, no dependency.

## Out of scope
- Saving Aceptar/Anular, Deshacer or the note (ticket 22).
- Listing cases in **Casos abiertos** (ticket 23).
- Reopening or resuming a saved case.
- Migrations beyond `CREATE TABLE IF NOT EXISTS`.
- Removing the mock user (ticket 20).
- Test tooling (still unchosen; spec open question).
