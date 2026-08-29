# 08 — Recommendation panel is driven by the model

Blocked by: 07
Status: open

## Goal
The model returns structured triage data alongside its conversational reply, and
the recommendation panel renders that instead of placeholders.

## Acceptance
- A JSON contract is agreed and written down before any code, covering the slots
  the panel already renders: `motivo`, `antecedentes`, five `signosVitales`
  (`label` / `value` / `unit`), `nivel` (a Manchester key), `confianza`,
  `razonamiento[]`, `informacionFaltante[]`, `proximosPasos[]`. Patient identity
  is **not** in it — it is not something the model should invent.
- `chat()` returns the recommendation next to `response`, and the panel renders
  from it.
- The model's output is validated before it reaches the UI. A malformed or
  partial response leaves the previous panel state intact and is surfaced, never
  rendered as blank or half-filled slots.
- `nivel` outside the five Manchester keys is rejected rather than coerced.
- Any field the model does not supply keeps its placeholder; the panel never
  shows an empty section.
- The clinician's override (Anular) wins over any later model suggestion until
  they clear it — a new AI answer must not silently overwrite a level a human
  chose.
- Aceptar / Anular / + Nota keep working as in ticket 05.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- **This changes the level card's default.** Tickets 04 and 05 made it neutral
  grey until a clinician overrides, precisely because no AI level existed. Once
  the model suggests one, the card shows that suggestion in its Manchester colour
  and "anulado por clínico" stops being the only path to colour. That is a
  deliberate reversal of spec Q15b/Q16b and should be recorded.
- **Keep the human in the loop.** The project description is explicit that the
  system assists without replacing the professional's judgement. Nothing here may
  auto-accept a level, and the AI's number should stay visibly the AI's
  suggestion rather than a decision already made.
- Confidence comes from the model claiming a number. A model-reported confidence
  is not a calibrated probability; decide how much weight the UI gives it before
  putting a percentage next to a triage level.
- Vitals are a real question: the model would be extracting numbers from prose
  the clinician typed. Wrong extraction here is a clinical risk, not a display
  bug. Consider showing them as "leído de la conversación" and easy to correct.

## Open questions
- One model call returning both prose and structure, or a second call dedicated
  to the panel? One call is cheaper and keeps them consistent; two keep the chat
  fast and let the panel update independently.
- Does the panel recompute on every message, or only when the clinician asks for
  it? Recomputing on every message means the level can flicker mid-conversation.

## Out of scope
- PDF attachments and real RAG.
- Persisting cases; per-case history.
