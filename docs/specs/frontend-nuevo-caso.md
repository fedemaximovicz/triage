# TriageAI — Frontend (static mockup port)

## Problem
The TriageAI concept exists only as a bundled HTML mockup (`docs/TriageAI.html`)
that can't be edited, extended, or run as part of the real app. Before any
Ollama/backend work begins, the team needs the visual target and interaction
model reproduced in the real stack so UI and backend work can proceed
independently. A clinician needs to see the intended "Nuevo caso" experience —
the conversation and the recommendation panel — even though no real analysis
happens yet.

## Solution
A faithful, pixel-close port of the mockup's three-column "Nuevo caso" screen to
Next.js + React + Tailwind, with placeholder content in every dynamic slot and
no backend. The clinician sees the left nav, a central chat, and a right
recommendation panel. They can type a message and get a canned placeholder AI
reply; they can operate the panel's actions (Aceptar, Anular, + Nota) as
pure front-end state. All content is placeholder or structural chrome — no real
clinical data. State is in-memory; reloading resets to the seeded state.

## User stories
1. As a clinician, I open the app and see the three-column "Nuevo caso" screen —
   left nav, chat in the center, recommendation panel on the right — matching the
   mockup's look.
2. As a clinician, I see the chat pre-seeded with four placeholder bubbles in the
   nurse→AI→nurse→AI shape, using labeled-slot text (e.g. `[mensaje del clínico]`,
   `[respuesta IA]`).
3. As a clinician, I type in the composer and send; my message appears as a new
   bubble, a typing indicator shows briefly, then a canned placeholder AI reply
   appears. The recommendation panel does not change.
4. As a clinician, sending an empty message does nothing; I cannot send another
   message while the AI reply is pending.
5. As a clinician, I see the recommendation panel with its section labels
   (Motivo, Antecedentes, SIGNOS VITALES, RECOMENDACIÓN IA, RAZONAMIENTO CLÍNICO,
   INFORMACIÓN FALTANTE, PRÓXIMOS PASOS) and placeholder values under each.
6. As a clinician, I see the level card in a neutral default state — grey,
   `[nivel]`, placeholder confidence — because no AI level is suggested yet.
7. As a clinician, I click Anular… and get the 5-level Manchester picker
   (rojo, naranja, amarillo, verde, azul); picking one recolors the level card
   to that level's real color and marks it as overridden by the clinician.
8. As a clinician, I click Aceptar [nivel] and a confirmation toast appears.
9. As a clinician, I click + Nota and a note textarea opens for this case.
10. As a clinician, the nav items other than "Nuevo caso" are visible but inert;
    clicking them does nothing yet.
11. As a clinician, reloading the page resets the screen to its seeded placeholder
    state (nothing persists).

## Decisions
- Faithful static port of `docs/TriageAI.html`, three columns, placeholder data,
  no backend — see ADR 0001.
- Input is conversational chat, not a structured form — ADR 0001.
- Chat echoes the message and posts a canned placeholder AI reply that does not
  recompute the panel — ADR 0001.
- Right-panel actions (Aceptar, Anular, + Nota, toast) are pure front-end state —
  ADR 0001.
- Manchester 5-color scale is the official scale — see CONTEXT.md; ESI rejected.
- Level card is neutral by default; the Manchester colors are real design
  constants that appear only when a clinician overrides via Anular.
- Fixed UI chrome/labels (logo, nav labels, case header, user footer, composer
  labels, panel section labels) are kept as-is from the mockup; only dynamic
  content is placeholdered.
- State is in-memory only; no localStorage — ADR 0001.
- Single page; nav routing is non-functional for now.

## Testing
- No test harness is configured yet in this repo (the `check` command in
  CLAUDE.md is still a TODO and package.json has only `lint`), so there is no
  existing seam to extend.
- Test through user-visible behavior at the component/DOM seam (e.g. React
  Testing Library driving the "Nuevo caso" screen): sending a message appends a
  bubble and yields a canned reply; empty send is a no-op; send is blocked while
  a reply is pending; Anular recolors the level card to the picked Manchester
  level; Aceptar shows the toast; + Nota reveals the textarea.
- Choosing and wiring a test runner is itself an open question (below).

## Out of scope
- Any backend, API route, or Ollama integration.
- Real clinical data, real vitals, or real AI analysis / recommendations.
- Chat driving the panel (keyword parsing, confidence updates, missing-info
  changes).
- Vitals extraction from the conversation.
- Attachments / PDF upload flow.
- Multilingual input and the language badge.
- Persistence across reload (localStorage or otherwise).
- The Inicio, Casos abiertos, Documentos, and Estadísticas screens; nav routing.
- Auth / login.
- Settings (model config, Ollama endpoint).

## Open questions
- No test tooling exists in the repo yet. Which runner/library should the
  frontend be tested with (e.g. Vitest + React Testing Library, Playwright),
  and should adding it be part of this work? Adding a dependency needs your
  approval per CLAUDE.md.
- Exact typing-indicator delay for the canned AI reply (the mockup used ~1.6s);
  a fixed value is assumed unless you want it configurable.
