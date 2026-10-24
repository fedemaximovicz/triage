# 18 — The index persists on disk and is reused while knowledge/ is unchanged

Blocked by: 17
Status: done

## Goal
The index of the **base de conocimiento** is saved to `.rag-index/` and reused
across server restarts, so the corpus is embedded again only when the contents
of `knowledge/` actually change. A failed build never leaves a half-built index
behind. The clinician sees no difference except that the first turn after a
restart no longer pays for re-embedding everything.

## Acceptance
- After a successful build, the index is written to `.rag-index/` together with
  a hash of the contents of `knowledge/`.
- After a server restart with `knowledge/` unchanged, the first turn that needs
  the index loads it from disk and embeds nothing.
- Adding, removing or editing a file in `knowledge/` changes the hash, and the
  next build re-indexes from scratch and replaces what is on disk.
- A build that fails partway persists nothing: the previous index on disk (if
  any) is not left half-overwritten, and the turn ends in the error bubble as in
  ticket 17.
- With `knowledge/` missing or empty, no index is built or loaded, and the
  ticket 17 behavior holds (no RAG, console warning).
- `.rag-index/` is in `.gitignore`.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0009: an on-disk index, rebuilt only when a hash of `knowledge/` changes;
  no partial index is ever persisted. It rejects an in-memory index (it
  re-embeds on every start) and an external vector DB.
- The hash covers file contents, not modification times; the spec chose the
  hash precisely because timestamps are unreliable.
- What happens to a stale `.rag-index/` when `knowledge/` becomes empty is not
  specified beyond "no RAG". Not loading it is enough; deleting it is optional.
- Verify with the same throwaway, uncommitted `.md` as ticket 17: restart, check
  that nothing is embedded, then edit it and check that it re-indexes.

## Out of scope
- Starting indexing at **Iniciar caso** (ticket 19).
- Watching `knowledge/` for changes while the server runs; a change is noticed
  at the next build.
- Any change to retrieval, chunking or the threshold.
- Test tooling (still unchosen; spec open question).
