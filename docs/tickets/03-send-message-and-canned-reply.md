# 03 — Clinician sends a message and gets a canned placeholder AI reply

Blocked by: 02
Status: open

## Goal
The composer becomes functional: the clinician types a message, it appears in the
thread, a typing indicator shows, and a canned placeholder AI reply is appended
after a short delay. The reply does not change the recommendation panel.

## Acceptance
- Typing a message and pressing Enter or clicking Enviar appends the message as a
  new nurse bubble and clears the input.
- After sending, a typing indicator appears, then a canned placeholder AI reply
  bubble (e.g. `[respuesta IA]`) is appended after a short fixed delay.
- Sending an empty or whitespace-only message does nothing.
- While an AI reply is pending, sending is blocked (no second message can be
  sent until the reply arrives).
- The recommendation panel does not change as a result of sending.
- Typecheck and lint pass; the behavior works in the browser without console
  errors.

## Notes
- Canned reply does not recompute the panel — ADR 0001, Q6a.
- Fixed typing delay (~1.6s from the mockup) unless the user asks for
  configurable — spec open question.
- All state in-memory; reload resets — ADR 0001.
