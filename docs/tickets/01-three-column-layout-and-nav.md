# 01 — Nuevo caso screen renders with the three-column layout and left nav

Blocked by: none
Status: open

## Goal
Opening the app renders the "Nuevo caso" screen as a three-column layout (left
nav, center, right panel) faithful to `docs/TriageAI.html`, in the real
Next.js + React + Tailwind stack. The left nav is fully built as chrome; the
center and right columns exist as empty/skeletal placeholders to be filled by
later tickets. This is the thinnest end-to-end path that proves the page renders.

## Acceptance
- Visiting the root route shows three columns side by side matching the mockup's
  proportions and background.
- The left nav shows: the TriageAI logo (teal triangle + wordmark), the items
  Inicio · Casos abiertos · Nuevo caso · Documentos · Estadísticas with
  "Nuevo caso" in the active state, and the user footer (M. Soto — Enfermería ·
  Turno tarde).
- Nav items other than "Nuevo caso" are visible but inert (no navigation).
- The center and right columns render as placeholders (empty containers with the
  correct widths/structure); no chat or panel content yet.
- Typecheck and lint pass; the page renders without console errors.

## Notes
- Faithful static port, single page, in-memory only — ADR 0001.
- Keep the mockup's fixed chrome/labels as-is (Q12a); use IBM Plex Mono per the
  mockup's font stack.
- Reference the decoded mockup structure in `docs/TriageAI.html` for exact
  layout, colors, and spacing.
