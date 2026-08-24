# 0001 — Frontend as a static port of the TriageAI mockup

## Decision
The first frontend slice is a faithful, pixel-close port of `docs/TriageAI.html` (three columns: nav, chat, recommendation panel) to Next.js 16 + React 19 + Tailwind 4, with placeholder content in every dynamic slot and no backend. The chat echoes the clinician's message and posts a canned placeholder AI reply; the right-panel actions (Aceptar, Anular, + Nota, toast) are pure front-end state. State is in-memory only; a reload resets to the seeded placeholder state.

## Why
Locking the visual target and interaction model before wiring Ollama lets UI work and backend work proceed independently, and getting the look right first is the cheapest step. Placeholder data keeps the port free of canned clinical content while the real data flow is still undesigned.

## Rejected
- **Structured input form** — the mockup's input is conversational chat, not a vitals form.
- **Building the Ollama API route now** — deferred; chat results and vitals extraction are out of scope for this slice.
- **ESI scale** — Manchester 5-color scale chosen (see `CONTEXT.md`).
- **localStorage persistence** — in-memory only for now.
