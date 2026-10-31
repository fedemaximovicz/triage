# 24 — The clinician edits the panel: name, vitals and level

Blocked by: 22, 23
Status: done

## Goal
The clinician can fill in what the panel shows instead of only reading it: the
patient's name, vital signs, and the level picked straight from the card
without going through Anular. What they enter outranks the model and goes to
it as context on the next turn. The nav loses the two items with no page
behind them.

## Acceptance
- The nav no longer shows **Inicio** or **Estadísticas**.
- Clicking the level card opens the level picker under it. Picking a level
  shows it on the card as "Elegido por clínico · sin confirmar", hides the
  confidence bar, shows "IA sugiere: X" when the model disagrees, and saves
  nothing. Later model turns don't move it.
- **Aceptar** saves `aceptado` with the level the card shows. **Anular** works
  as before. Picking from the card while a decision is in force clears the
  saved decision.
- The patient name is editable in place, saved to `cases.paciente` on blur or
  Enter, only if it changed; an empty name is null. An existing
  `.data/triage.db` gets the column when it is opened.
- Casos abiertos shows a **Paciente** column ("sin identificar" when empty).
- Clicking a vital edits its value and unit; **+ Signo vital** adds one with
  signo, valor and unidad (signo and valor required). Clinician vitals are
  marked "· clínico" and "Quitar mi dato" removes them.
- A later model turn never overwrites a clinician vital; vitals with other
  labels keep updating from the model.
- Each clinician turn sends the name and clinician vitals to the model as
  context for that turn only, validated on the server (12 vitals, 100
  characters per field).
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0011 is the decision record; it extends ADR 0005 (human precedence) and
  ADR 0010 (`paciente` column) and builds on ADR 0009 (per-turn context).
- The panel reports the clinician's data to `CaseView` through
  `onClinicianDataChange`; `CaseView` keeps it in a ref and passes it to
  `chat()`. The panel remounts per case, so a new case starts empty.
- Verified with the real model on case #2458: FC 112 entered by hand stayed
  while the model read FC 90 from the message, and the model's TA was added.

## Out of scope
- Saving clinician vitals with the case.
- Restoring the panel from the database after a reload (no reopening).
- Editing motivo, antecedentes or the reasoning lists.
- Test tooling (still unchosen; spec open question).
