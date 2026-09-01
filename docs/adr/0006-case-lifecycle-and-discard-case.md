# 0006 — A case must be started, and discarding it is the only reset

## Decision
The app **opens with no case**. The centre column shows an empty thread with a
single centred **Iniciar caso** button and a disabled composer; the right panel
is dimmed behind "Iniciá un caso para ver la recomendación" and shows none of
its action buttons. Nothing is sent to the model until the clinician starts a
case.

**Iniciar caso** assigns the case its number and start time, resets the
server-side chat session, and only then sends the initial triage prompt (ADR
0007) — the reset is chained ahead of the prompt, not fired alongside it, or
the model answers the first question of a new case with the previous case in
its context. The `resetChatEngine()` call that runs today when `Chat` mounts is
removed; mounting no longer means a case exists.

With a case active, the chat header carries a **Descartar caso** button. It
opens a modal confirmation naming what is lost; confirming clears the
conversation, the panel, the override/acceptance, the clinician's note and the
model session together, and **immediately starts a fresh case** with a new
number and start time. The button is named for the loss rather than the gain,
because the gain is not the part that needs reading before the click — and
because "Nuevo caso" is already the name of the screen and of the nav item.

Case numbers are an **in-memory counter starting at 2451**, reset on reload.
They come from the row id once a database exists.

**Reiniciar caso is removed.** Its useful half — releasing a human decision
without destroying the case — becomes a time-limited **Deshacer** offered in
the toast that Aceptar and Anular already raise. Taking it returns the level to
the model's control and brings the confidence bar back.

## Why
The empty start exists because the initial triage prompt has to go somewhere,
and a case that begins on page load begins without anyone deciding to begin
it — a reload, a stray tab restore or a browser prefetch would each open a
"case" and burn a model turn on nobody. Making the clinician press once is the
cheapest way to make the case's start an actual event, which is also what gives
the header a real number and start time to display.

The modal is a deliberate departure from ADR 0005, which rejected a modal for
un-accepting a triage in favour of a second click. The two acts are not
comparable: un-accepting loses one field the clinician can re-enter in a
second, while discarding loses an entire interview, and a second click on a
button already under the hand is exactly the wrong shape for that — the whole
point is to interrupt a hand already moving. Restarting immediately rather than
returning to the empty state follows from why anyone presses it: the clinician
is not tidying up, they have the next patient in front of them.

Removing Reiniciar caso is forced by ADR 0007's accumulation rule. Once the
model repeats everything it knows in every JSON block, clearing the panel buys
one turn of blankness before the next reply refills it from the model's memory;
a button whose effect the next message silently undoes teaches the clinician
that the panel lies. What Reiniciar caso was actually load-bearing for was the
escape hatch ADR 0005 relied on when it kept Anular available after Aceptar —
so that hatch is rebuilt where the mistake happens, in the toast, seconds after
the click, instead of as a permanent control at the bottom of the panel that
invites a full reset for what is usually a slip.

## Rejected
- **Fixing Reiniciar caso to also clear the chat** — the smallest change, but it
  merges two acts a clinician distinguishes clearly: correcting a decision, and
  moving to the next patient.
- **Starting a case automatically on load** — no button to press, but the case's
  start becomes an accident of navigation, and every reload spends a model turn.
- **One button with the same label in both states** — "Iniciar caso" on an empty
  screen and on a screen full of clinical data are different acts with the same
  word on them, read the same way by a hand already moving.
- **Labelling the header button "Nuevo caso"** — matches the mockup's vocabulary,
  but collides with the screen's own name in `CONTEXT.md` and with the nav item,
  leaving one term with two meanings and a nav entry that does not do what its
  namesake does.
- **A second click instead of a modal** — consistent with ADR 0005's un-accept,
  but the cost of an accidental confirmation is an entire interview, not one
  field.
- **Returning to the empty state after discarding** — visually consistent with
  the app's start, but adds a second click between the clinician and the patient
  in front of them.
- **Keeping Reiniciar caso alongside Descartar caso** — two adjacent controls
  whose names read as synonyms and whose effects are worlds apart; and with ADR
  0007's accumulation the panel-only reset barely holds for one turn.
- **A permanent "Soltar decisión" link in the panel footer** — always available,
  but it is a standing invitation to reset a decision, when the real need is
  narrow: undoing the click that just happened.

## Notes
- Supersedes ADR 0005's statement that "**Reiniciar caso** clears override,
  acceptance and panel data together, and is the only way back to a blank
  panel". Everything else in ADR 0005 stands unchanged — replacement per turn,
  human precedence, the hidden confidence bar, the `confianza` normalisation.
- `CONTEXT.md` is updated: *Reiniciar caso* is gone; *Iniciar caso*, *Descartar
  caso*, *Prompt inicial de triage* and *Deshacer* are added, and *Anular* and
  *Aceptar* no longer point at a reset that does not exist.
- The **duration of the Deshacer window** is not fixed here. The panel already
  has `TOAST_DURATION_MS` (2800) and `ANULAR_CONFIRM_MS` (4000); whether the
  undo simply lives as long as the toast is a spec-level call.
- Debt unchanged: `chatSession` in `actions.ts` is still a module-level
  singleton. Chaining the reset makes it correct for one clinician at a time,
  not for concurrent cases.
