# 0011 — The clinician edits the panel, and what they enter outranks the model

## Decision
The recommendation panel is no longer read-only. The clinician can type the
**patient's name**, **correct or add vital signs**, and **pick the level from
the card** itself.

**Level from the card.** Clicking the level card opens the level picker below
it. A level picked there only moves the card: nothing is saved, the card keeps
its provisional treatment and reads "Elegido por clínico · sin confirmar". The
confidence bar is hidden, and if the model disagrees its level appears as "IA
sugiere: X", as with any human level (ADR 0005). Only **Aceptar** saves, with
whatever level the card shows; **Anular** is unchanged and still saves
`anulado`. Picking from the card while a decision is in force releases that
decision (saved as null, like Deshacer) so the saved decision never disagrees
with the card; the clinician accepts again.

**Patient name.** Saved with the case in a new `cases.paciente` column, on blur,
only if it changed; an empty name is null. Casos abiertos shows it. Databases
created before the column get it through an `ALTER TABLE` when `db.ts` opens
them, since `CREATE TABLE IF NOT EXISTS` leaves an existing table as it was.

**Vitals.** A vital the clinician corrected or added is never overwritten by a
later model turn. A clinician vital replaces the model's vital with the same
label (case-insensitive) in place; clinician vitals the model doesn't have are
listed after the model's. The model keeps updating only the vitals nobody
touched, per turn as ADR 0005 says. The label of an existing vital can't be
changed, only its value and unit. "Quitar mi dato" drops the clinician's version
and the model's, if any, shows again. Clinician vitals are marked "· clínico".
They are **not** saved with the case.

**Context for the model.** On every clinician turn, the name and the
clinician's vitals go to the model as a system message for that turn only,
placed with the contexto recuperado (ADR 0009) right before the clinician's
message, never added to memory and never saved. It tells the model these are
the clinician's data, outrank its own reading, and need not be asked again. The
server checks what arrives: at most 12 vitals and 100 characters per field;
anything malformed is dropped without failing the turn.

## Why
This extends ADR 0005's human precedence from the level to every field the
clinician can now touch: the system assists and never overrides the
professional, so a value a person entered can't be revoked by the next model
turn. Picking a level without saving it separates "this is my reading" from "I
confirm this triage", and keeps one rule for what is saved: what was on the
card when Aceptar was clicked. Sending the panel data as per-turn context keeps
the model from asking again for what is already on screen, without spending
ADR 0008's `num_ctx` on it every turn after.

## Rejected
- **Picking from the card saves `anulado` (or `aceptado` when it matches the
  AI)** — turns a provisional reading into a recorded decision on one click.
- **Letting the next model turn replace edited vitals** — what ADR 0005 does
  for the model's own fields, but it would revoke a value a person entered.
- **Matching vitals by position** — the model reorders and drops vitals between
  turns; the label is the only stable key.
- **Adding the panel data to the model's memory** — resent every turn, and a
  stale copy stays in the history after the clinician corrects it.
- **Saving clinician vitals with the case** — not asked for yet; it needs a
  table of its own.

## Notes
- Resolves what ADR 0005 left open ("Editable vitals are deliberately not
  decided here").
- Extends ADR 0010's `cases` table with `paciente`.
- The level picked from the card isn't saved, so the database only learns it on
  Aceptar. Panel state isn't restored after a reload anyway (no reopening).
