# 22 — The clinician's decision and note are saved with the case

Blocked by: 21
Status: done

## Goal
What the clinician decides in the recommendation panel is saved with the case:
**Aceptar** and **Anular** store the decision and the level, **Deshacer**
clears it, and the clinician's note is stored once they finish writing it. The
panel looks and behaves exactly as today.

## Acceptance
- **Aceptar** saves `decision = aceptado` and `nivel_final` = the level it
  fixed.
- **Anular** saves `decision = anulado` and `nivel_final` = the level picked.
  Anular after Aceptar (the second-click confirmation, ADR 0005) overwrites
  the saved decision.
- **Deshacer** clears `decision` and `nivel_final` back to null.
- The note is saved when the clinician leaves the note field (blur) or closes
  it with **+ Nota**, not on every keystroke. An unchanged note is not
  re-sent. Clearing the text saves an empty note as null.
- Each save updates the case's `updated_at`.
- A failed save does not block or undo anything in the panel: the clinician's
  decision stays on screen. It is logged to the console; no new UI for it.
- Saves for a case that has been discarded meanwhile are not applied to the
  new case — every save carries the case number it belongs to.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0010 is the decision record; ADR 0005 and 0006 define Aceptar, Anular
  and Deshacer, and none of their behaviour changes.
- `RecommendationPanel` holds this state today with no backend. It needs the
  case number (from `CaseView`) to save against. The panel is already remounted
  per case by its `key`.
- Saves are fire-and-forget from the panel's point of view: it updates its own
  state first and does not wait for the server, so Aceptar feels as instant as
  now.
- The AI's own level keeps being saved by ticket 21 as `nivel_ia`; this ticket
  only writes the human side.

## Out of scope
- Showing the decision or note anywhere else (ticket 23 lists the level).
- Restoring the panel from the database after a reload (no reopening).
- A save indicator or error message in the panel.
- Test tooling (still unchosen; spec open question).
