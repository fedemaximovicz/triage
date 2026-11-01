# 19 — Iniciar caso warms the index in parallel with the opening turn

Blocked by: 17
Status: open

## Goal
Pressing **Iniciar caso** (and the restart that **Descartar caso** triggers)
starts preparing the index of the **base de conocimiento** in the background,
in parallel with the opening turn, so the clinician's first message usually
finds it ready. If they write before it finishes, that turn waits for it. The
opening turn itself never depends on the index.

## Acceptance
- **Iniciar caso** starts the index build or load without delaying the opening
  turn: the AI's first question arrives just as fast as it does without
  documents.
- A clinician message sent while that work is still running waits for it and
  then retrieves as usual; it never starts a second build.
- A failure in that background work does not touch the opening turn. It
  surfaces on the first clinician turn that needs the index, as the error
  bubble, and that turn tries again (ticket 17's rule).
- Each new case notices files dropped into `knowledge/` since the last case:
  the spec's "the next case reindexes them".
- With `knowledge/` missing or empty, **Iniciar caso** behaves exactly as today.
- **Reintentar** does not start indexing a second time.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0009 is the decision record. It rejects indexing lazily on the first
  clinician message, because that message would wait for the whole corpus to
  embed.
- ADR 0006 still chains the session reset ahead of the prompt inicial. The
  index work runs alongside that chain, not inside it, and must not reorder it.
- If ticket 18 is already done, a new case with `knowledge/` unchanged is a
  hash check plus a load from disk, not a rebuild. If it isn't, each new case
  in a fresh server rebuilds in memory. Both orders are fine.
- Decide in this ticket whether `CONTEXT.md`'s **Iniciar caso** entry should
  mention that it starts indexing (spec open question). Propose the line; don't
  edit the glossary without asking.

## Out of scope
- Indexing at server start or at build time.
- A loading indicator for indexing in the UI.
- Any change to retrieval, chunking, the threshold or persistence.
- Test tooling (still unchosen; spec open question).
