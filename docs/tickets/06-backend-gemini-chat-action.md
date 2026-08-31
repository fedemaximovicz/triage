# 06 — Server action talks to Gemini through LlamaIndex

Blocked by: none
Status: done

## Goal
`src/app/actions.ts` exists as a server action module that sends a clinician's
message to Gemini through LlamaIndex and returns the reply. The RAG scaffolding
(`processDocs`, `resetChatEngine`) is present with the same shape the base
project used, but nothing feeds it yet. No UI file is touched in this ticket.

## Acceptance
- `docs/adr/0002-backend-gemini-via-llamaindex.md` records the decision to
  implement the backend against the Gemini API through LlamaIndex, and
  supersedes the parts of ADR 0001 that put the backend and Ollama out of scope.
  It states that Ollama remains the eventual target and that Gemini is used
  because Ollama is not installed on the dev machine.
- `src/app/actions.ts` is marked `'use server'` and exports `chat(query)`,
  `processDocs(lcDocs)` and `resetChatEngine()`, mirroring the base project.
- `Settings.llm` is a `Gemini` and `Settings.embedModel` a `GeminiEmbedding`,
  both constructed with `apiKey` read explicitly from `process.env.GEMINI_API_KEY`.
- The model is `GEMINI_MODEL.GEMINI_2_5_FLASH_LATEST` with `temperature: 0`.
- `chat(query)` returns `{ response: string }`. It uses the module-level
  `ContextChatEngine` when documents have been indexed and a `SimpleChatEngine`
  otherwise, so it works with no documents loaded.
- `chat()` reads the reply from `EngineResponse.message.content`, not the
  deprecated `.response` getter.
- `processDocs(lcDocs)` maps `{ pageContent, metadata }` to `Document`, builds a
  `VectorStoreIndex`, takes `asRetriever({ similarityTopK: 2 })` and replaces the
  module-level chat engine. Nothing calls it yet.
- `resetChatEngine()` awaits `reset()` — it returns a promise in 0.12.1.
- A missing or empty `GEMINI_API_KEY` fails with a clear error naming the
  variable, rather than an opaque provider error.
- `.env.example` documents `GEMINI_API_KEY` (name only, never a value) so the
  requirement is discoverable from a fresh clone, and `.env.local` stays
  gitignored.
- Typecheck and lint pass.

## Verification
Manual, once `GEMINI_API_KEY` is present in `.env.local`: call `chat()` and
confirm a real Gemini reply comes back. No automated test — no runner is
configured in this repo yet (spec open question).

## Notes
- API surface verified against the installed `llamaindex@0.12.1` /
  `@llamaindex/google@0.4.0`, not from the base project's README. Deltas from the
  base `actions.ts`: `serviceContextFromDefaults` is gone (use `Settings`);
  provider subpath imports are gone (use `@llamaindex/google`); `Gemini` takes a
  flat config, not `modelMetadata`; `fromDocuments` no longer takes a
  `serviceContext`; `reset()` is async; `.response` is deprecated.
  `ContextChatEngine({ retriever, chatModel })` and
  `asRetriever({ similarityTopK })` are unchanged.
- The provider defaults to `getEnv("GOOGLE_API_KEY")`. This project uses
  `GEMINI_API_KEY`, so the key must be passed explicitly to **both** the LLM and
  the embedding — neither picks it up on its own.
- `GEMINI_MODEL` is an enum, not a free string; a newer model id needs a cast.
- Debt, deliberately kept faithful to the base project: `chatEngine` is a
  module-level singleton shared across every request and case. Fine for a
  single-user demo, wrong once several cases are open. Not addressed here.
- `Settings` has no `chunkOverlap` (only `chunkSize`); the base project's
  `chunkOverlap: 20` needs another route. Deferred to the RAG ticket.
- `llamaindex` and `@llamaindex/google` are pinned exact and must be bumped
  together, or two copies of `@llamaindex/core` break `Settings` and `instanceof`.

## Out of scope
- Wiring `Chat.tsx` to the action — next ticket; it supersedes ticket 03's canned
  reply.
- Structured output driving the recommendation panel — later ticket; the panel
  keeps its placeholders.
- PDF loading and real RAG — later ticket.
- Streaming responses, per-case chat history, auth.
