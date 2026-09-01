# 15 — Deshacer releases the human decision, and Reiniciar caso goes away

Blocked by: 14
Status: todo

## Goal
After **Aceptar** or **Anular**, the toast those actions already raise offers
**Deshacer** for a short window. Taking it releases the decision: the level goes
back under the AI's control and the confidence bar reappears. With that escape
hatch in place, **Reiniciar caso** is removed — with the accumulation rule of
ticket 12 the model refills the panel on the next turn anyway, so clearing the
panel bought a single turn of blankness.

## Acceptance

### Deshacer
- The toast raised by **Aceptar** and by **Anular** carries a **Deshacer**
  action.
- Taking it clears the override and the acceptance: no human decision is in
  force, the card returns to showing the AI's suggested level with ADR 0005's
  provisional treatment (or the neutral placeholder card if the AI has no level
  yet), the "confirmado / anulado por clínico" marker is gone, and the
  confidence bar is visible again.
- Once the window passes, the toast and its Deshacer are gone and the decision
  stands.
- ADR 0005's existing routes are untouched: Anular still works over an accepted
  level behind its second click, and Aceptar still works over an overridden one.
- Deshacer only ever releases the most recent decision; it is not a general undo
  stack.

### Removing Reiniciar caso
- The **Reiniciar caso** control at the foot of the panel is removed, along with
  its handler. No control anywhere else takes its name.
- Nothing else regresses: the panel still reconciles per turn, human precedence
  still holds, and **Descartar caso** (ticket 14) remains the way to get a blank
  panel.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0006 is the decision record; it supersedes ADR 0005's line that Reiniciar
  caso "is the only way back to a blank panel". Everything else in ADR 0005
  stands.
- **The duration of the Deshacer window is this ticket's open question.** The
  panel already has `TOAST_DURATION_MS` (2800) and `ANULAR_CONFIRM_MS` (4000).
  Simplest is for the undo to live exactly as long as the toast; if that reads as
  too short in the browser, propose a longer toast for undo-carrying toasts
  rather than a second timer with its own lifetime.
- ADR 0006 rejected a permanent "Soltar decisión" link in the panel footer: the
  real need is narrow — undoing the click that just happened — and a standing
  control is a standing invitation to reset.
- Order matters. Removing Reiniciar caso before Deshacer exists would leave the
  clinician with no way back from an accidental Aceptar short of discarding the
  case, which is exactly the cost ADR 0005 was guarding against.

## Out of scope
- A general undo history for panel actions.
- Persisting or logging released decisions.
- Any change to ADR 0005's reconciliation, precedence, hidden confidence bar, or
  `confianza` normalisation.
- Test tooling (still unchosen; spec open question).
