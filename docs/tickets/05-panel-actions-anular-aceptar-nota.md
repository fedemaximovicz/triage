# 05 — Clinician can Anular (pick Manchester level), Aceptar, and add a Nota

Blocked by: 04
Status: done

## Goal
The recommendation panel's actions become functional as pure front-end state:
Anular opens the 5-level Manchester picker and recolors the level card, Aceptar
fires a confirmation toast, and + Nota opens a note textarea.

## Acceptance
- Clicking Anular… opens a picker listing the five Manchester levels (rojo,
  naranja, amarillo, verde, azul) with their labels and colors.
- Picking a level recolors the level card to that level's real color, shows its
  label and sub-label, and marks the card as overridden by the clinician.
- Clicking Aceptar [nivel] shows a confirmation toast that auto-dismisses.
- Clicking + Nota reveals a note textarea that accepts typing for this case.
- Anular, + Nota (and any note text) are all in-memory; a reload resets them.
- Typecheck and lint pass; the interactions work in the browser without console
  errors.

## Notes
- Actions are pure front-end state, no backend — ADR 0001, Q14a.
- Manchester scale is the official scale — CONTEXT.md.
- Toast and override styling follow the mockup.
