# 0008 — Local model on Ollama through LlamaIndex; Gemini removed

## Decision
The app talks only to a local Ollama (`llama3.2:3b`, same machine as Next) through LlamaIndex.TS and `@llamaindex/ollama`, with an explicit `num_ctx` (default 8192) and temperature 0; Gemini — `@google/genai`, `@llamaindex/google`, `GEMINI_API_KEY` — is removed entirely, superseding ADR 0004.

## Why
The project description commits to an LLM running on Ollama, and ADR 0002 kept LlamaIndex precisely so this would be a provider swap rather than a rewrite; ADR 0004 only parked that path because the Gemini provider was broken, a reason that disappears with Gemini itself. Keeping a second provider alive behind a flag would mean maintaining and verifying two paths for a project that will only ever ship one. `num_ctx` is set explicitly because Ollama truncates context silently at its small default, and an interview that accumulates the full JSON every turn (ADR 0007) would lose the start of the case without any error. A 3B model will miss the JSON block more often; that is accepted under ADR 0003 as-is, since ADR 0007's accumulation lets the next valid turn restore the panel. Errors reuse the existing error bubble and Reintentar; streaming stays out, as in ADR 0002.

## Rejected
- **Calling Ollama's HTTP API directly with fetch** — no new dependency, but RAG (chunking, index, retrieval) would be hand-built.
- **Ollama's OpenAI-compatible endpoint via the `openai` SDK** — a new dependency with no gain over the native path.
- **Keeping Gemini selectable by env** — two providers to maintain and verify for one shipped target.
- **Ollama's default `num_ctx`** — silent truncation of the case history.
- **Auto-retrying a turn with no valid JSON** — doubles latency on that turn and changes ADR 0003's behavior.
- **Timeout or streaming for slow local inference** — not needed yet; revisit if latency proves unacceptable.
