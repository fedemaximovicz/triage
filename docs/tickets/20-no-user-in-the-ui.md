# 20 — The UI shows no user

Blocked by: —
Status: done

## Goal
The app has no user management, so it stops showing a made-up one. The nav
loses its user footer and the case header stops naming a nurse. Nothing else
changes.

## Acceptance
- The nav has no user footer (avatar, "M. Soto", "Enfermería · Turno tarde");
  the nav items keep their place at the top.
- With a case active, the chat header's second line reads "Iniciado HH:mm",
  with no "· Enf. M. Soto".
- No other text, layout or behaviour changes.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- The mock user lives in `src/components/Nav.tsx` (the "User footer" block)
  and `src/components/Chat.tsx` (the header's start-time line).
- ADR 0010 is the decision record: no users, and nothing in the database
  records who did what.
- Ticket 01 and `docs/specs/frontend-nuevo-caso.md` mention the user footer as
  part of the ported mockup. They describe what was built then; propose
  whether to annotate them, don't edit them without asking.
- Independent of tickets 21–23; can land in any order.

## Out of scope
- Any login, user, role or shift concept.
- Restyling the nav to fill the space the footer leaves.
- Changes to `docs/reference/` or `docs/TriageAI.html` (the original mockup).
