# 16 — The chat is answered by llama3.2:3b on Ollama, and Gemini is gone

Blocked by: none
Status: open

## Goal
Every turn — the prompt inicial, **Reintentar** and every clinician message —
is answered by `llama3.2:3b` running in Ollama on the same machine as Next,
through LlamaIndex. Nothing changes for the clinician: same thread, same panel,
same error bubble. Gemini is removed from the code, the dependencies and the
configuration. No RAG yet: there is no retrieval in this ticket.

## Acceptance
- Before anything else, `@llamaindex/ollama` is confirmed to share
  `@llamaindex/core` (and `@llamaindex/env`) with `llamaindex@0.12.1`. If no
  version does without bumping `llamaindex`, stop and ask — do not bump.
- With Ollama running and `llama3.2:3b` pulled, **Iniciar caso** produces the
  AI's first question, and an interview fills the panel exactly as it does today
  (`{ response, recommendation }` unchanged).
- The model runs at temperature 0 with an explicit `num_ctx`, defaulting to
  8192.
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL` and the `num_ctx` value are read from the
  environment, with defaults that work for a local Ollama; `.env.example`
  documents them and no longer mentions `GEMINI_API_KEY`.
- With Ollama stopped, or the model not pulled, the turn ends in the usual
  error bubble, and the opening turn offers **Reintentar**.
- A turn with no valid JSON block leaves the panel as it was, with no visible
  error (ADR 0003 as-is).
- **Descartar caso** still resets the model's memory: the new case's opening
  turn knows nothing of the previous one.
- `@google/genai` and `@llamaindex/google` are gone from `package.json` and the
  lockfile; no Gemini code or `GEMINI_API_KEY` reference remains in `src/`.
- ADR 0004 gets a line saying it is superseded by ADR 0008.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- ADR 0008 is the decision record; it supersedes ADR 0004 and revives ADR
  0002's LlamaIndex path. The parked `llamaindex-engine.ts` is the starting
  point, not code to keep parked — when this ticket is done there is one
  engine, not two.
- The version-lock gotcha is in memory (`llamaindex-version-lock`): exact pins
  on both sides, and `pnpm add -E` silently skips rewriting the specifier when
  the range is already satisfied. Verify with a bare
  `node -e "import('llamaindex')"` — the "already imported" warning means two
  copies of core.
- Adding `@llamaindex/ollama` and removing the Gemini packages is authorised by
  ADR 0008 / the spec; still ask before running each install command
  (CLAUDE.md).
- `buildInstructedMessage`, `extractJsonBlock`, `validateRecommendation` and the
  prompt inicial are unchanged (ADR 0003, 0007). The parked file's copies have
  drifted from `actions.ts` (it lacks the accumulation rule and the
  `confianza` instruction, and doesn't cap vitals at five) — `actions.ts`'s
  versions are the current ones.
- Ollama silently truncates at `num_ctx`; that is the reason it is explicit.
- Verifying needs a real Ollama with `llama3.2:3b` pulled. If it isn't
  available, that is an environment failure: stop and report.

## Out of scope
- RAG, embeddings, `knowledge/` (tickets 17–19).
- Streaming, timeouts, auto-retry of turns without JSON.
- Keeping Gemini selectable, or any other provider.
- Per-case chat sessions (the module-level singleton debt stays).
- Test tooling (still unchosen; spec open question).
