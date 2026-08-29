# 0002 — Backend implemented as a server action on LlamaIndex with Gemini

## Decision
The backend starts now. `src/app/actions.ts` is a Next server action module that
uses LlamaIndex.TS to talk to an LLM, with **Gemini** as the LLM and embedding
provider. Its structure is ported from the base project's `actions.ts`:
`chat()`, `processDocs()` and `resetChatEngine()`, with the module-level chat
engine and the `Document → VectorStoreIndex → Retriever → ContextChatEngine`
pipeline kept intact. `chat()` falls back to a `SimpleChatEngine` when no
documents have been indexed, which is the normal case for now.

This supersedes ADR 0001 on two points: the backend and the model integration are
no longer out of scope, and the canned placeholder reply from ticket 03 is
replaced by a real model call once the UI is wired up. Everything else in
ADR 0001 — the three-column port, Manchester as the scale, the panel's
placeholder content, in-memory state — still stands. The recommendation panel is
explicitly *not* driven by the model yet.

## Why
The model integration has to start somewhere, and the conversational slice is the
smallest piece that produces a real, verifiable result end to end.

Gemini rather than Ollama because Ollama is not installed on the dev machine.
Ollama remains the eventual target — the project description commits to an LLM
running on Ollama — and LlamaIndex is what makes that reversible: swapping the
provider back is changing the LLM and embedding construction, not the pipeline.

Keeping the base project's shape, including the RAG scaffolding that nothing
calls yet, means the RAG work later is additive rather than a rewrite. The
scaffolding costs a few unused exports today.

## Rejected
- **Ollama now** — not installed locally. Deferred, not abandoned.
- **Calling the Gemini API directly, without LlamaIndex** — less indirection
  today, but discards the retriever/index pipeline that RAG is already planned to
  need, and makes the eventual return to Ollama a rewrite instead of a swap.
- **Dropping `processDocs`/`resetChatEngine` until RAG is real** — they are the
  seam the base project is built around; keeping them preserves the structure the
  course material follows.
- **Structured JSON output driving the recommendation panel** — deferred to its
  own ticket. Folding it in here would make this slice hard to verify and would
  couple the first model call to an undesigned data contract.
- **Streaming responses** — Next server actions cannot send intermediate results,
  the same limitation the base project hit. Revisit with a route handler if the
  latency proves unacceptable.
- **Per-case chat history** — the module-level singleton is kept, faithful to the
  base project. It is wrong once multiple cases are open; recorded as debt in
  ticket 06 rather than solved here.
