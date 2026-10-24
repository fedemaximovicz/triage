# 17 — Clinician turns get contexto recuperado from the base de conocimiento

Blocked by: 16
Status: open

## Goal
When `knowledge/` holds `.md`/`.txt` files, each clinician turn looks up the
passages of the **base de conocimiento** closest to what the clinician just
wrote and hands them to the model as **contexto recuperado**, for that turn
only. The clinician sees nothing new. With `knowledge/` missing or empty, the
app works exactly as after ticket 16. In this ticket the index lives in memory
and is built the first time a clinician turn needs it; persistence and
pre-warming come later.

## Acceptance
- Embeddings come from Ollama with `OLLAMA_EMBED_MODEL`, defaulting to
  `bge-m3`; `.env.example` documents it.
- Only `.md` and `.txt` files in `knowledge/` are indexed; anything else is
  ignored.
- Chunks are ~512 tokens with 50 overlap; retrieval returns the top 3 that pass
  a similarity threshold. All three are constants in code, and the threshold is
  visibly marked as a placeholder until calibrated against real documents.
- Retrieval searches with **only the clinician's own text** — never the
  instructed message with ADR 0003's instructions appended.
- The opening turn and **Reintentar** never retrieve.
- Passing fragments reach the model as a system message on the current turn
  only. They never enter the chat history: the next turn does not resend them.
- When no fragment passes the threshold, the turn carries no context message at
  all.
- The context message tells the model it is reference material on the
  Manchester protocol: what the clinician said about the patient wins over it,
  and irrelevant passages are ignored.
- Nothing retrieved is shown in the thread or the panel, and the JSON contract
  is unchanged.
- With `knowledge/` missing or empty, turns work without RAG and the server
  console says so.
- If indexing or the query embedding fails (embedding model not pulled,
  unreadable file), the turn ends in the usual error bubble, and the next turn
  tries indexing again from scratch.
- **Descartar caso** does not discard the index.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0009 is the decision record; glossary terms in `CONTEXT.md`.
- `ContextChatEngine` retrieves with the full turn message, so it can't be used
  as-is: retrieval is done by hand on the raw clinician text, and the fragments
  are passed for that turn only. Keeping them out of history is what keeps the
  interview inside ADR 0008's `num_ctx`.
- The parked engine's chunking note still applies: `Settings` in 0.12.1 has no
  `chunkOverlap`, so overlap needs a node parser.
- `bge-m3` must be pulled in Ollama alongside `llama3.2:3b`; a missing model is
  an environment failure — stop and report.
- There are no protocol documents yet. Verify with a throwaway `.md` in
  `knowledge/` that is **not committed**; writing the real protocol is out of
  scope.
- Two turns racing the first build should not index twice — at most one build in
  flight.

## Out of scope
- Persisting the index or detecting changes to `knowledge/` (ticket 18).
- Starting indexing at **Iniciar caso** (ticket 19).
- PDF or other formats; uploading documents from the UI.
- Adding the case's `motivo` to the retrieval query.
- Sources or citations for the clinician; a `fuentes` field.
- Calibrating the threshold's real value.
- Test tooling (still unchosen; spec open question).
