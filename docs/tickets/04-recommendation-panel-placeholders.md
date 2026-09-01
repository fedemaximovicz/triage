# 04 — Recommendation panel renders placeholders with a neutral level card

Blocked by: 01
Status: done

## Goal
The right column renders the recommendation panel faithful to the mockup's
structure, with placeholder content in every dynamic slot and a neutral default
level card. This ticket is display-only; the panel's actions are wired in
ticket 05.

## Acceptance
- The panel shows the patient header and the section labels kept as-is: Motivo,
  Antecedentes, SIGNOS VITALES, RECOMENDACIÓN IA, RAZONAMIENTO CLÍNICO,
  INFORMACIÓN FALTANTE, PRÓXIMOS PASOS.
- Patient identity, Motivo, and Antecedentes values are placeholder slots.
- The SIGNOS VITALES grid renders five cells with placeholder labels and values
  in a neutral tone (no crit/warn coloring).
- Razonamiento, Información faltante, and Próximos pasos render as placeholder
  lists.
- The level card is neutral by default: grey, `[nivel]` label, placeholder
  confidence and confidence bar — no Manchester color shown yet.
- The action buttons (Aceptar, Anular…, + Nota) are visible but not yet
  functional.
- Typecheck and lint pass; the page renders without console errors.

## Notes
- Level card neutral until override; Manchester colors are design constants
  applied only on Anular — spec, Q15b/Q16b.
- Vitals labels and values are both placeholdered (Q16b).
- Chat does not drive the panel — out of scope.
