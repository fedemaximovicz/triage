# 14 — Descartar caso throws the current case away and opens another

Blocked by: 11
Status: todo

## Goal
With a case open, the chat header carries **Descartar caso**. It confirms
through a modal that names what is lost, then clears the conversation, the
panel, the human decision, the note and the model's memory together, and opens a
fresh case on the spot — new number, new start time, and the AI's first question
already on its way.

## Acceptance

### The control
- **Descartar caso** appears in the chat header only while a case is open.
- The label is exactly that — not "Nuevo caso", which is the name of the screen
  and the nav item (CONTEXT.md).
- Pressing it opens a modal stating that the current case will be lost.
  Cancelling changes nothing at all — thread, panel, note and decision are
  exactly as they were.

### Confirming
- Confirming clears, together: every message in the thread; the panel's
  displayed recommendation; the override and the acceptance; the clinician's
  note (and the note box closes); any open Anular picker or pending
  confirmation; the server-side chat session.
- A new case opens immediately — new number from the in-memory counter, new
  start time in the header — and the prompt inicial is sent for it, chained
  after the session reset exactly as in ticket 11.
- The clinician is never returned to the empty state of ticket 10 by this
  action; that state is reachable only by reloading.
- If the new case's opening turn fails, ticket 13's Reintentar applies to it
  normally.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0006 is the decision record.
- The modal is a deliberate departure from ADR 0005's second-click pattern for
  un-accepting a triage. Do not "harmonise" them: un-accepting loses one field
  the clinician can re-enter in a second, discarding loses an entire interview,
  and a second click on a button already under the hand is the wrong shape for
  interrupting a hand already moving.
- The button is named for the loss rather than the gain because the loss is what
  needs reading before the click.
- The note is cleared here. Today's `Reiniciar caso` does not clear it — that is
  a bug this ticket does not inherit.

## Out of scope
- Deshacer, and removing Reiniciar caso (ticket 15) — `Reiniciar caso` stays at
  the foot of the panel, unchanged, until then.
- Persisting or archiving the discarded case anywhere.
- Multiple concurrent cases; the `chatSession` singleton is unchanged.
- Test tooling (still unchosen; spec open question).
