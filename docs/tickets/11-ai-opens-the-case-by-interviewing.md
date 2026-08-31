# 11 — Starting a case makes the AI open the conversation

Blocked by: 10
Status: todo

## Goal
Pressing **Iniciar caso** resets the model's session and then sends a fixed
**prompt inicial de triage** that the clinician never sees. What they see is the
AI's first bubble, asking a single question. From there the AI keeps
interviewing one question at a time and risks a provisional Manchester level as
soon as it has anything to go on.

## Acceptance

### Sending
- Starting a case resets the server-side chat session and **then** sends the
  initial prompt. The reset is awaited first — a new case must never be answered
  with the previous case in the model's context.
- The `resetChatEngine()` call that runs today when the chat mounts is removed;
  mounting no longer implies a case.
- The initial prompt is fixed in code and sent as the clinician's turn, carrying
  the same JSON contract instruction every turn carries (ADR 0003).

### Rendering
- The initial prompt **never appears in the thread**. There is no clinician
  bubble at the top of the conversation the clinician did not write.
- While the opening turn is in flight, the typing indicator shows and the
  composer is blocked, exactly as for an ordinary turn.
- On success, exactly one AI bubble is appended: the model's first question.

### What the prompt asks for
- The model interviews **one question at a time**, conversationally — not a
  checklist of everything triage needs.
- It never stops asking; it keeps requesting what is still missing as the case
  develops.
- From the first turn that yields anything useful it also supplies `nivel` and
  `confianza`, so a provisional level appears in the card early and moves as the
  clinician answers. ADR 0005's provisional treatment already renders this
  correctly — do not change how it looks.
- The opening turn returns the full contract like any other turn; nearly every
  field being absent is normal and already handled field by field.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0007 is the decision record; ADR 0006 covers the chained reset.
- **The exact wording of the prompt is this ticket's open question.** ADR 0007
  fixes its obligations, not its text. Expect one round of trying it against the
  real model and adjusting — a model that answers with a numbered list of eight
  questions has not met the acceptance criteria.
- Keep the human in the loop: an early provisional level is a suggestion, never
  an auto-acceptance. Nothing here may fix a level.
- The instruction that the model repeat everything it already knows belongs to
  ticket 12. Without it, this ticket's interview will visibly drop earlier panel
  fields — that is expected until 12 lands.
- `chatSession` in `actions.ts` is still a module-level singleton (ADR 0004
  debt). Chaining the reset makes it correct for one clinician at a time, not
  for concurrent cases.

## Out of scope
- Failure handling and Reintentar (ticket 13).
- The accumulation rule in the per-turn instruction (ticket 12).
- Descartar caso (ticket 14), Deshacer (ticket 15).
- Any change to ADR 0005's reconciliation, precedence or confidence rules.
- Test tooling (still unchosen; spec open question).
