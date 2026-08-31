# 12 — The panel stops losing what the AI already knew

Blocked by: none
Status: todo

## Goal
The per-turn instruction requires the model to repeat, in **every** JSON block,
everything it already knows about the case — not only what the latest message
added. Case state accumulates on the model's side, so the panel can go on
replacing its contents per turn (ADR 0005) without a turn about breathing
wiping the `motivo` the clinician has been looking at for four turns.

## Acceptance
- `buildInstructedMessage` instructs the model that each JSON block must carry
  the complete current picture of the case: every field it has established so
  far, restated, plus whatever this turn added or corrected.
- The instruction keeps ADR 0003's existing rules intact — omit what you cannot
  determine, never invent a value, never invent the patient's identity,
  `nivel` one of the five lowercase words or absent, `confianza` an integer
  0–100.
- Restating is not re-asserting: a field the model has since learned was wrong
  is corrected in the next block, not preserved.
- Across a multi-turn conversation where each turn adds one new piece of
  information, the panel accumulates on screen — `motivo`, `antecedentes` and
  vitals established earlier are still rendered after later turns about
  something else.
- The panel's own reconciliation is **unchanged**: it still replaces per turn,
  a field absent from this turn still falls back to its placeholder, and
  `nivel`/`confianza` still persist together as ADR 0005's carve-out. No merge
  logic is added to the component.
- A `null` recommendation or a failed call still leaves the panel untouched.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0007 is the decision record. It rejects accumulating in the panel
  explicitly: that reintroduces the cross-turn collage ADR 0005 was written to
  prevent, where a stale field and a fresh one sit side by side with nothing
  telling them apart. Keep the burden on the model.
- Independent of the case-lifecycle chain, but it becomes urgent the moment
  ticket 11 turns the conversation into an interview of many small turns. It can
  be worked before or after 11; the behavior is easier to see once 11 has landed.
- Each block grows with the case. No cap is imposed — ADR 0005 rejected
  truncating clinical lists — but a long interview is where to watch for it.

## Out of scope
- Any change to `validateRecommendation` or the contract's shape (ADR 0003).
- Any change to ADR 0005's replacement, precedence, or confidence rules.
- The case lifecycle (tickets 10, 11, 14, 15).
- Test tooling (still unchosen; spec open question).
