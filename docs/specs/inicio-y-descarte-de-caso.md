# Inicio, descarte y apertura de caso

## Problem
Today the app has no notion of a case beginning: the page loads, the thread is
empty, and the clinician faces a composer with nothing to react to — they have
to invent the first message and know in advance what the AI needs. Worse, there
is no way out of a case: `Reiniciar caso` clears the panel but leaves the whole
conversation and the model's memory of it in place, so the next patient is
triaged on top of the previous one's context. A clinician moving from one
patient to the next has no honest way to start over.

## Solution
A case must be started, and once started the AI opens the conversation by
interviewing the clinician.

On load there is no case: an empty thread with a single **Iniciar caso** button
and a disabled composer, and a dimmed panel. Pressing it stamps the case with a
number and start time, resets the model's session, and sends a fixed **prompt
inicial de triage** the clinician never sees — they see only the AI's first
bubble, asking the single most useful question. The AI keeps interviewing one
question at a time, filling the panel as it learns, and risks a provisional
Manchester level as soon as it has anything to go on.

With a case open, the chat header carries **Descartar caso**. It confirms
through a modal, then throws away the conversation, the panel, the human
decision, the note and the model's memory together, and starts a fresh case on
the spot. `Reiniciar caso` is gone; the one thing it was needed for — walking
back an accidental Aceptar or Anular — becomes a short-lived **Deshacer** in the
toast those actions already raise.

## User stories
1. As a clinician, I load the app and there is no case: the thread is empty with
   a centred **Iniciar caso** button, the composer is disabled, and the right
   panel is dimmed behind "Iniciá un caso para ver la recomendación" with none
   of its action buttons visible.
2. As a clinician, I press **Iniciar caso**: the header shows a case number and
   start time, the composer unlocks, a typing indicator appears, and the AI's
   first bubble asks me one question.
3. As a clinician, I never see the prompt that produced that first bubble —
   there is no bubble of mine at the top of the thread I did not write.
4. As a clinician, I answer; the AI asks the next single question rather than a
   list, and the panel fills in as it goes.
5. As a clinician, I see a provisional Manchester level in the card as soon as
   the AI has enough to guess, marked as unconfirmed, and it moves as I answer
   more.
6. As a clinician, data the AI extracted three turns ago is still on the panel
   now — the panel does not lose `motivo` because this turn was about breathing.
7. As a clinician, if the opening turn fails I get an error bubble with a
   **Reintentar** button; the case is still started and I can type instead.
8. As a clinician, pressing **Reintentar** re-sends the opening prompt; once I
   send a message of my own the button is gone.
9. As a clinician, I press **Descartar caso** in the header and a modal tells me
   the current case will be lost; cancelling changes nothing.
10. As a clinician, confirming that modal clears the thread, the panel, the
    override/acceptance, the note and the model's memory, and immediately opens
    a new case with a new number and start time whose first AI question is
    already on its way.
11. As a clinician, after **Aceptar** or **Anular** the toast offers
    **Deshacer**; taking it releases my decision — the level goes back under the
    AI's control and the confidence bar reappears.
12. As a clinician, once the Deshacer window passes my decision stands, and the
    only ways to change it are the ones ADR 0005 already gave me (Anular over an
    accepted level, behind its second click; Aceptar over an overridden one).
13. As a clinician, there is no **Reiniciar caso** control anywhere.
14. As a clinician, I cannot send a message while any turn is in flight,
    including the opening one.
15. As a clinician, reloading the page puts me back at the empty state with no
    case; nothing persists and case numbering starts over.

## Decisions
- The app opens with no case; the case's start is an explicit act — ADR 0006.
- **Iniciar caso** resets the server chat session and *then* sends the prompt,
  chained; the reset that runs today when the chat mounts is removed — ADR 0006.
- Case numbers are an in-memory counter from 2451, reset on reload; they come
  from the row id once a database exists — ADR 0006.
- The header button is **Descartar caso**, named for the loss; "Nuevo caso"
  stays the name of the screen and the nav item — ADR 0006, CONTEXT.md.
- Discarding confirms through a modal, unlike ADR 0005's second-click for
  un-accepting: the cost is an entire interview, not one field — ADR 0006.
- Confirming restarts immediately rather than returning to the empty state —
  ADR 0006.
- **Reiniciar caso** is removed; its escape-hatch role moves to **Deshacer** in
  the Aceptar/Anular toast — ADR 0006, superseding that point of ADR 0005.
- The prompt inicial is fixed in code, sent as the clinician's turn, and never
  rendered in the thread — ADR 0007.
- The AI interviews one question at a time and never stops asking, but suggests
  a provisional level from the first useful turn — ADR 0007.
- The opening turn returns the full recommendation contract like any other turn;
  absent fields are already handled field by field — ADR 0007, ADR 0003.
- The prompt requires the model to repeat everything it knows in every JSON
  block: state accumulates on the model's side, and the panel keeps replacing
  per turn — ADR 0007, leaving ADR 0005 intact.
- A failed opening turn leaves the case started and surfaces **Reintentar**,
  which retires once the clinician sends their own message — ADR 0007.
- All state stays in memory; nothing persists across reload — ADR 0001.

## Testing
No test runner is configured in this repo yet — the `check` command in
`CLAUDE.md` is still a TODO and `package.json` has only `lint`, so there is no
existing seam to extend and no similar tests to follow. This is the same open
question the previous spec recorded and it is still open.

Tested through user-visible behavior at the component/DOM seam, with the model
call stubbed:
- the empty state offers only **Iniciar caso**, and the composer rejects input;
- **Iniciar caso** stamps header number/time, blocks the composer, and appends
  exactly one AI bubble — and no clinician bubble — on success;
- the session reset is observably ordered before the opening prompt;
- a rejected opening call yields the error bubble plus **Reintentar**;
  **Reintentar** re-sends; sending a message removes it;
- **Descartar caso** does nothing until the modal is confirmed; confirming
  empties the thread and panel, clears note and human decision, and produces a
  new case number and a fresh opening turn;
- **Deshacer** in the toast returns the card to the AI's level and restores the
  confidence bar; after the window it is gone and the decision stands;
- a turn whose JSON repeats earlier fields keeps them on the panel (the
  accumulation contract), while ADR 0005's per-turn replacement still holds.

## Out of scope
- Persisting cases, or case numbers backed by a database.
- More than one case open at a time; the server chat session is still a
  module-level singleton and this work does not fix that.
- Retry for ordinary turns — **Reintentar** exists only for the opening one.
- Editable vitals (still its own ticket, per ADR 0005).
- The wording of the model's clinical questions beyond "one at a time".
- Attachments / PDF upload, nav routing, auth, settings.
- Any change to ADR 0005's reconciliation, human precedence, hidden confidence
  bar, or `confianza` normalisation.

## Open questions
- **Duration of the Deshacer window.** The panel already has
  `TOAST_DURATION_MS` (2800) and `ANULAR_CONFIRM_MS` (4000). Does Deshacer
  simply live as long as the toast, or does the toast get extended when it
  carries an undo?
- **Exact wording of the prompt inicial.** ADR 0007 fixes its shape and
  obligations, not its text; it needs writing and probably one round of trying
  it against the real model.
- **Test tooling.** Still nothing in the repo. Adding a runner needs your
  approval per `CLAUDE.md`.
