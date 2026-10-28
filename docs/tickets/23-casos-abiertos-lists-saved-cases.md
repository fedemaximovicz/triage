# 23 — Casos abiertos lists the saved cases

Blocked by: 21
Status: done

## Goal
The **Casos abiertos** nav item opens a read-only list of the saved cases that
have not been discarded, newest first, so the clinician can see what was
triaged and at what level. Nothing in the list can be opened or edited yet.

## Acceptance
- **Casos abiertos** in the nav is a link to a new route, `/casos`, and is the
  active item there. **Nuevo caso** on `/casos` links back to `/`. The other
  nav items stay as inert as today.
- `/casos` reads the database on every request (never a build-time snapshot)
  and shows one row per case with `status = en_curso`, newest first:
  - **Caso** — `#` + number.
  - **Inicio** — date and time it started (`es-AR`, 24-hour).
  - **Nivel** — `nivel_final` when there is a human decision, labelled
    "confirmado" or "anulado"; otherwise `nivel_ia`, labelled "sugerido por IA";
    with neither, "sin nivel". Levels use the Manchester label and colour the
    panel already uses.
  - **Motivo** — the saved `motivo`, or "sin motivo".
- Discarded cases never appear.
- With no saved cases, the page says so in one line instead of showing an
  empty table.
- Rows are not clickable and there are no actions on the page.
- With ticket 22 not done yet, every row shows the AI's level — that is
  correct, not a bug.
- Layout matches the app's shell: same nav on the left, the list in the space
  the conversation and the panel use on `/`.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0010 is the decision record: list only, no reopening.
- `Nav` is rendered inside `CaseView` today and takes an `onNewCase`
  callback; on `/casos` there is no case to start. Propose how `Nav` serves
  both pages (e.g. a prop for the active item, links where there is no
  callback). Don't introduce a layout refactor beyond what the two pages need.
- The Manchester labels and colours live in `RecommendationPanel.tsx`
  (`LEVELS`), unexported. Propose whether to export or move them rather than
  copying them.
- Decide in the plan: clicking **Casos abiertos** with a case in progress
  takes the clinician off `/` and the case leaves the screen (it stays saved
  and listed). Propose whether that needs a confirmation like Descartar caso,
  or is fine as is since nothing is lost from the database.
- The list is case data on the clinician's machine; it is not exposed through
  any API route.

## Out of scope
- Opening, resuming or editing a case from the list.
- Filters, search, pagination or sorting controls.
- Showing discarded cases, messages or the note.
- Statistics (the **Estadísticas** item).
- Test tooling (still unchosen; spec open question).
