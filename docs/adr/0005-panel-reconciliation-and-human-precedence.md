# 0005 — Panel reconciliation per turn, and human decisions outrank the model

## Decision
The recommendation panel is **replaced per turn**: every valid recommendation
substitutes what the panel was showing, and a field the model does not supply
falls back to its placeholder rather than keeping the previous turn's value.
`nivel` and `confianza` are the single exception — they persist together until
another turn replaces them or the clinician resets the case.

A **human decision (Anular or Aceptar) fixes the level**, and no later model
turn moves it. When the model disagrees, its suggestion appears as a secondary
line ("IA sugiere: X"), never in the card itself. Both remain available to the
clinician afterwards: Anular still works on an accepted triage (behind a
second-click confirmation on the same button), and Aceptar still works on an
overridden level — they are two distinct acts, not a toggle. **Reiniciar caso**
clears override, acceptance and panel data together, and is the only way back
to a blank panel.

The level card shows the model's suggested level **in its real Manchester
colour** with visibly provisional treatment (the full-weight colour is reserved
for a level a human fixed). This **reverses spec Q15b/Q16b**, which made the
card neutral grey until an override — a rule that existed only because no AI
level was available then (ticket 08, Notes).

The **confidence bar is hidden whenever a human decision is in force**: that
number is the model's self-report, and showing it next to a level a person
chose attributes it to the person. `confianza` is interpreted as 0–100; a value
`≤ 1` is normalised as a fraction (`0.95` → 95%), and exactly `1` is discarded
as ambiguous. The prompt is tightened to ask for 0–100 so the fraction path is
defensive rather than routine.

A `null` recommendation (malformed or absent JSON) and a failed `chat()` call
both **leave the panel exactly as it is**; the failure is surfaced only in the
chat thread, alongside the reply the clinician is already reading. Empty arrays
from the model are treated as absent fields in `validateRecommendation` rather
than as valid empty lists, so no section can render empty.

`signosVitales` renders only the entries that arrived (capped at five in the
validator, as ADR 0003 already specified but did not enforce); if none arrived,
the section falls back to its five placeholder cards. `razonamiento`,
`informacionFaltante` and `proximosPasos` render every item with no cap. The
patient identity block stays in the panel with explicit not-available copy
instead of bracketed placeholder text.

## Why
Every rule here is chosen against the same reader: a nurse mid-triage, scanning
the panel in seconds, for whom the expensive error is mistaking an absent value
for a real one. Replacement per turn keeps the panel an honest picture of the
model's latest reading instead of a collage assembled across turns, where a
stale vital and a fresh level sit side by side with nothing distinguishing
them; `nivel` and `confianza` are carved out because a level that vanishes when
the model turns conversational is worse than a level that lingers, and they
must persist together or the card shows an orphan level with no confidence
under it. Human precedence and the hidden confidence bar are direct reads of
the project's human-in-the-loop requirement: the system assists and never
replaces the professional's judgement, so nothing the model produces may
overwrite or borrow the authority of something a person decided. Discarding an
ambiguous `confianza` of `1` costs a placeholder bar; reading 1% as 100% would
inflate confidence in an AI level at exactly the moment the model is saying it
does not know. Rendering vitals sparsely and lists in full follows the same
asymmetry — an empty `[--]` card reads as "measured and normal" on a fast scan,
while a truncated reasoning list can hide the one line that mattered.

## Rejected
- **Cumulative merge across turns** — keeps data on screen longer, but leaves
  the panel showing values from turns the clinician has since corrected, with
  no way to tell which turn any field came from.
- **Replacing `nivel` per turn like everything else** — internally consistent,
  but the level card would flicker back to grey whenever the model answered a
  conversational question without re-triaging.
- **Persisting `nivel` without `confianza`** — produces an orphan level next to
  `[--]%` and a placeholder rationale, which reads worse than no level at all.
- **Letting a later AI level overwrite an accepted or overridden one** — turns
  a recorded human decision into a suggestion the model can revoke.
- **Blocking Anular after Aceptar** — makes an accidental confirmation cost the
  entire case, since Reiniciar caso is the only other exit.
- **A modal confirmation for un-accepting** — a blocking interruption that
  forces the clinician to hunt a new target on screen; a second click on the
  button already under their hand is equally deliberate and cheaper.
- **Coercing `confianza = 1` to either 1% or 100%** — the ambiguity is real and
  both readings are plausible; guessing puts a wrong number beside a triage
  level.
- **Rendering five fixed vital slots regardless of what arrived** — a stable
  grid, but the empty slots are indistinguishable from measured-and-normal at a
  glance, and INFORMACIÓN FALTANTE is already the dedicated place for gaps.
- **Capping the reasoning / next-steps lists** — a verbose model is a prompt
  problem; silently dropping clinical text is not an acceptable fix for it.
- **Removing the patient identity block** — loses the panel's visual anchor and
  the mockup's shape, when the actual risk is only that bracketed placeholder
  text sits beside real clinical data.
- **Surfacing a malformed recommendation in the panel as well as the chat** —
  a second alert for something the clinician is already reading about in the
  reply, competing for attention with the clinical content itself.

## Notes
- This ADR supersedes spec `frontend-nuevo-caso.md` Q15b/Q16b (neutral-by-default
  level card) and the spec's "Chat driving the panel" out-of-scope line, both of
  which described a state of the world with no model attached.
- Editable vitals are deliberately **not** decided here. Ticket 08's note asks
  for them to be "easy to correct"; this ADR delivers only the "leído de la
  conversación" label, and correction is left to its own ticket — it needs
  per-vital validation, units, and a rule for what a later turn does to an
  edited value.
