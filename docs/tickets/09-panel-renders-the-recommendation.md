# 09 — The panel renders the model's recommendation

Blocked by: 08
Status: todo

## Goal
`RecommendationPanel` stops rendering placeholders and renders the
`recommendation` that `chat()` already returns, under the reconciliation and
precedence rules of ADR 0005.

Ticket 08 delivered and verified the backend half of this (contract, validator,
`chat()` returning `{ response, recommendation }`) and left the frontend half
open. This ticket is that half.

## Acceptance

### Wiring
- A new Client Component wraps `Chat` and `RecommendationPanel` and holds the
  latest recommendation; `page.tsx` stays a Server Component.
- `Chat` stops discarding `recommendation` from the `chat()` result and hands it
  up; the panel renders from it.

### Reconciliation (ADR 0005)
- Each valid recommendation replaces what the panel was showing. A field the
  model did not supply falls back to its placeholder — not to the previous
  turn's value.
- `nivel` and `confianza` are the exception: they persist together until another
  turn supplies them or the clinician resets the case.
- A `null` recommendation or a failed `chat()` call leaves the panel untouched.
  The failure is surfaced only in the chat thread, never in the panel.
- `validateRecommendation` treats an empty array as an absent field, so no
  section can render empty. `signosVitales` is capped at five entries, as
  ADR 0003 specified but did not enforce.

### Precedence (ADR 0005)
- Anular and Aceptar each fix the level; no later AI turn moves it.
- When the model's `nivel` differs from the fixed one, a secondary
  "IA sugiere: X" line appears. The card itself does not change.
- The AI's suggested level shows in its real Manchester colour with visibly
  provisional treatment; full-weight colour is reserved for a human-fixed level.
  **This reverses spec Q15b/Q16b** — recorded in ADR 0005.
- Anular remains available after Aceptar, behind a second click on the same
  button ("⇄ ¿Anular triage confirmado?", reverting on its own after ~4s).
  Aceptar remains available after Anular.
- The confidence bar is hidden whenever a human decision is in force.
- A new "Reiniciar caso" action clears override, acceptance and panel data
  together.

### Rendering (ADR 0005)
- `confianza` is interpreted 0–100; `≤ 1` normalises as a fraction; exactly `1`
  is discarded as ambiguous. The prompt in `buildInstructedMessage` is tightened
  to ask for 0–100.
- `signosVitales` renders only the entries that arrived. If none arrived, the
  section falls back to its five placeholder cards.
- `razonamiento`, `informacionFaltante` and `proximosPasos` render every item,
  no cap.
- The vitals section carries a "leído de la conversación" label — these are
  numbers the model extracted from the clinician's prose, not measurements.
- `motivo` and `antecedentes` wrap over multiple lines instead of being clipped
  to one.
- The patient identity block keeps its place with explicit not-available copy
  (e.g. "Paciente sin identificar · sin datos de admisión") instead of
  bracketed placeholder text.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- **Keep the human in the loop.** Nothing here may auto-accept a level, and the
  model's number stays visibly a suggestion rather than a decision already made
  (ProjectDescription; ticket 08 Notes).
- Replacement per turn has a known cost, accepted deliberately in ADR 0005: a
  vital the clinician saw one turn can return to `[--]` the next if the model
  answers conversationally without re-triaging.
- `confianza` is the model's self-report, not a calibrated probability
  (ADR 0003). It is hidden under human decision precisely so it never reads as
  endorsing a person's call.
- The `chatSession` singleton in `actions.ts` is still module-level and shared
  across cases (ADR 0004 debt). Out of scope here, but "Reiniciar caso" and
  `resetChatEngine()` now overlap conceptually — decide whether the new action
  should also reset the model's memory.

## Out of scope
- Editable vitals. ADR 0005 delivers only the "leído de la conversación" label;
  correction needs per-vital validation, units, and a rule for what a later turn
  does to an edited value — its own ticket.
- Real patient identity / admission integration.
- Persisting cases, per-case history, multiple concurrent cases.
- PDF attachments and real RAG.
- Test tooling (still unchosen; spec open question).
