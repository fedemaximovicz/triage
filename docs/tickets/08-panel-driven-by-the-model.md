# 08 — Recommendation panel is driven by the model

Blocked by: 07
Status: done

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
- ~~One model call returning both prose and structure, or a second call
  dedicated to the panel?~~ Resolved: one call (ADR 0003).
- ~~Does the panel recompute on every message, or only when the clinician asks
  for it?~~ Resolved: every message (ADR 0003).

## Out of scope
- PDF attachments and real RAG.
- Persisting cases; per-case history.

## Progress
Backend slice done, verified live end to end (real Gemini reply + a
correctly-shaped `recommendation`, both malformed-JSON and API-error paths
confirmed to leave the composer usable):
- `docs/adr/0003-recommendation-json-contract.md` — the JSON contract and the
  one-call/prompt-plus-parse approach.
- `src/app/actions.ts` — `Recommendation` type, per-field validator (`nivel`
  rejected-not-coerced), the instruction block appended to every message, the
  fenced-JSON extractor, and `chat()` returning `{ response, recommendation }`.
- `docs/adr/0004-direct-gemini-via-google-genai.md` — mid-ticket pivot: calls
  `@google/genai` directly instead of through LlamaIndex, because
  `@llamaindex/google`'s Gemini provider has no path to a model this API key
  still supports (hardcoded model-metadata table, confirmed stale even in
  npm's latest release). The LlamaIndex implementation is preserved, unused,
  in `src/app/llamaindex-engine.ts` for the eventual Ollama switch.

Still open (next session):
- `RecommendationPanel.tsx` still renders placeholders — nothing reads
  `recommendation` yet.
- Lifting state so `Chat` and `RecommendationPanel` (currently unconnected
  siblings) can share the latest recommendation.
- Per-field placeholder fallback in the panel; malformed/`null` recommendation
  surfaced without wiping the panel's current state.
- Override-wins-over-AI precedence (Anular vs. a later AI `nivel`).
- The level card's default-becomes-colored behavior (spec Q15b/Q16b reversal,
  see Notes above) — not yet implemented, panel is still neutral-only.
- Note from live testing: the model returned `confianza` as a 0–1 fraction
  (e.g. `0.95`) rather than the contract example's implied 0–100 percentage.
  The validator accepts either (it only checks "finite number"); the panel
  step should pick one convention and normalize before display.
