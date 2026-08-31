# 0004 — Direct Gemini calls via @google/genai, LlamaIndex parked for Ollama

## Decision
`src/app/actions.ts`'s `chat()`, `processDocs()`, and `resetChatEngine()` now
call `@google/genai` directly — a `GoogleGenAI` client and a module-level
`Chat` session (`ai.chats.create()` / `.sendMessage()`) — instead of going
through LlamaIndex.TS's `Settings` / `ContextChatEngine` / `SimpleChatEngine`.
`processDocs()` is a documented no-op in this path; real RAG was already out
of scope (ticket 06/08).

The LlamaIndex-based implementation from ticket 06 is not deleted. It moves,
verbatim, to `src/app/llamaindex-engine.ts` — a real, typechecked module that
nothing imports, kept for the day Ollama is installed and this project
reconnects to it as ADR 0002 originally intended.

`buildInstructedMessage`, `extractJsonBlock`, `validateRecommendation`, and
the `Recommendation` type (ADR 0003) are unchanged — they operate on raw text
and a parsed JSON value, not on any LlamaIndex or `@google/genai` type, so the
provider swap underneath them is invisible.

## Why
`@llamaindex/google`'s `Gemini` class reads context-window size from a
hardcoded `GEMINI_MODEL_INFO_MAP` with no fallback for an unlisted model:
```
contextWindow: GEMINI_MODEL_INFO_MAP[this.model].contextWindow
```
The map tops out at `gemini-2.5-flash-lite`. `gemini-2.5-flash` — the model
ticket 06 pinned — was deprecated by Google mid-project
(`This model models/gemini-2.5-flash is no longer available to new users`).
Casting to a newer id (`gemini-3.6-flash`) satisfies TypeScript but crashes at
runtime (`Cannot read properties of undefined (reading 'contextWindow')`)
before the request ever reaches Google's API. Checked npm's actual latest
(`@llamaindex/google@0.4.1`) directly — same map, nothing past 2.5-flash-lite.
There is no version to bump to today; this is a hard ceiling in the package,
not a config problem.

ADR 0002's reversibility bet — LlamaIndex makes the eventual Ollama swap "a
provider change, not a rewrite" — is worth keeping, just not worth blocking
on right now while Gemini itself is unusable through it. Parking the working
LlamaIndex code in its own file preserves that bet for later without letting
a currently-broken dependency gate today's work.

## Rejected
- **Waiting on a `@llamaindex/google` release with newer models** — no ETA,
  and ticket 08's chat feature needs to work now.
- **Deleting the LlamaIndex implementation** — throws away real, working code
  and the ADR 0002 reversibility argument for no reason; parking it costs
  nothing but an unused file.
- **Commenting the old implementation out in place in `actions.ts`** —
  commented-out code isn't typechecked or linted and silently bit-rots; a
  real unimported module stays honest about whether it still compiles.
- **Trying every remaining `GEMINI_MODEL` enum member live before switching**
  — the enum is capped at the 2.5 generation regardless; even a hit there
  would leave the project stuck the next time Google deprecates a model,
  which is the actual problem here.

## Notes
- `@google/genai` is now an explicit direct dependency (previously only
  transitive, via `@llamaindex/google`) — no new package downloaded, `1.52.0`
  was already resolved in the lockfile.
- `llamaindex` and `@llamaindex/google` stay as dependencies; `llamaindex-engine.ts`
  still needs them to typecheck.
- Restoring the LlamaIndex path later means wiring `llamaindex-engine.ts`'s
  `chat`/`processDocs`/`resetChatEngine` back into `actions.ts`'s exports —
  the surrounding `buildInstructedMessage`/`extractJsonBlock`/`validateRecommendation`
  layer (ADR 0003) does not need to change to do that.
