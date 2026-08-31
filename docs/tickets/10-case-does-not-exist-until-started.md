# 10 — The case does not exist until the clinician starts it

Blocked by: none
Status: todo

## Goal
The app stops opening straight into a usable conversation. It opens with **no
case**: an empty thread offering a single **Iniciar caso** button, a disabled
composer, and a dimmed recommendation panel. Pressing **Iniciar caso** stamps
the case with its number and start time, unlocks the composer and activates the
panel. Nothing is sent to the model yet — that is ticket 11.

## Acceptance

### Empty state
- On load there is no case. The thread area shows a centred **Iniciar caso**
  button and nothing else; the seeded/hardcoded header values are not shown as
  if a case were open.
- The composer is disabled and cannot send: typing is blocked and Enter does
  nothing.
- The right panel is dimmed and shows "Iniciá un caso para ver la
  recomendación". None of its action buttons (Aceptar, Anular, + Nota) are
  visible.

### Starting
- Pressing **Iniciar caso** opens a case: the chat header shows a case number
  and a start time, replacing the hardcoded `Caso #2451 · Nuevo` / `Iniciado
  14:33`.
- The case number is an in-memory counter starting at 2451 and incrementing per
  case; the start time is the moment the button was pressed.
- After starting, the composer is enabled and the panel renders normally with
  its placeholders and its action buttons.
- The **Iniciar caso** button is gone from the thread once a case is open.
- Reloading the page returns to the empty state with no case, and the counter
  starts over at 2451.

### Shape
- Whatever holds "is there a case, and which one" lives where both the
  conversation and the panel can read it — the panel's empty state and the
  chat's empty state are the same fact, not two.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0006 is the decision record for all of the above.
- The counter is deliberately in-memory and deliberately resets on reload; the
  number comes from the row id once a database exists (ADR 0006). Do not invent
  persistence here.
- The nav item and the screen are still called **Nuevo caso** (CONTEXT.md) —
  that name is not reused for any button in this work.
- `Reiniciar caso` still exists at the foot of the panel after this ticket and
  behaves exactly as it does today. It is removed in ticket 15, not here.

## Out of scope
- The prompt inicial de triage and any model call (ticket 11).
- Descartar caso, the confirmation modal, and clearing a case (ticket 14).
- Deshacer and the removal of Reiniciar caso (ticket 15).
- Persisting cases or case numbers; multiple concurrent cases.
- Test tooling (still unchosen; spec open question).
