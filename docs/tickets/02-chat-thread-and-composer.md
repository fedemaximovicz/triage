# 02 — Chat column shows the seeded placeholder conversation and composer

Blocked by: 01
Status: open

## Goal
The center column renders the "Nuevo caso" conversation faithful to the mockup:
the case header, the status pill, a pre-seeded thread of placeholder bubbles, and
the composer. This ticket is display-only; sending is wired in ticket 03.

## Acceptance
- The center column shows the case header (case number + "Nuevo", "Iniciado …"
  line) and a status pill, kept as-is from the mockup.
- The thread is pre-seeded with four placeholder bubbles in the
  nurse→AI→nurse→AI shape, using labeled-slot text (e.g. `[mensaje del clínico]`,
  `[respuesta IA]`) — no real clinical dialogue.
- Nurse and AI bubbles use their distinct mockup styling (alignment, AI avatar,
  bubble shape). No attachment chips and no language badge are rendered.
- The composer renders at the bottom: the drag-PDF hint text, the text input
  (placeholder "Describe el estado del paciente…"), and the Adjuntar and Enviar
  buttons. The input accepts typing; buttons are present but not yet functional.
- Typecheck and lint pass; the page renders without console errors.

## Notes
- Attachments, language badge, and multilingual input are out of scope — spec.
- Placeholder = labeled-slot text (Q11b); seeded 4-bubble shape (Q10b).
