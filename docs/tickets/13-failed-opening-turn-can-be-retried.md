# 13 — A failed opening turn can be retried

Blocked by: 11
Status: todo

## Goal
When the opening turn fails — no `GEMINI_API_KEY`, network down, model 404 —
the clinician gets the usual error bubble plus a **Reintentar** button that
re-sends the prompt inicial. The case stays started either way, so they can also
just start typing. Once they send a message of their own, Reintentar retires.

## Acceptance
- A failed opening call appends the error bubble the chat already shows on
  failure, and alongside it a **Reintentar** action.
- The case remains started: the header keeps its number and start time, and the
  composer is usable.
- Pressing **Reintentar** re-sends the prompt inicial as a fresh turn — typing
  indicator, composer blocked — and on success appends the AI's first question.
- A retry that fails again leaves **Reintentar** available.
- **Reintentar** disappears as soon as the clinician sends a message of their
  own, and does not come back for later failures: it exists only for the opening
  turn.
- Retrying does **not** reset the model session a second time; the reset already
  happened when the case started.
- Ordinary turns are unaffected — they fail exactly as they do today, with no
  retry affordance.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0007 is the decision record. It rejects cancelling the case on a failed
  opening turn (discarding a case number and start time over a transient error)
  and rejects a permanently available Reintentar (it would re-open an interview
  in a conversation that has already moved on).
- The error surfaces only in the thread, never in the panel — ADR 0005, and the
  panel is untouched by a failed call.
- Easiest way to see this working is an unset/invalid `GEMINI_API_KEY`, which is
  also the most likely real cause.

## Out of scope
- Retry for ordinary turns.
- Distinguishing failure kinds in the message (missing key vs network vs model).
- Descartar caso (ticket 14), Deshacer (ticket 15).
- Test tooling (still unchosen; spec open question).
