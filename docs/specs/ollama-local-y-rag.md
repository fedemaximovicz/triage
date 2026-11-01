# Modelo local en Ollama y RAG sobre el protocolo Manchester

## Problem
The project commits to an LLM running on Ollama, but today every turn goes to
Gemini through a hosted API, so triage depends on an external service, an API
key and a model Google can deprecate mid-project (as it already did once). The
model also triages from its own general knowledge alone: nothing grounds its
Manchester level in the protocol itself, so two clinicians can get readings
that no document backs.

## Solution
The clinician-facing screen does not change. Every turn is answered by
`llama3.2:3b` running in Ollama on the same machine as the app; Gemini is gone.

Once the protocol documents exist, each clinician turn after the opening one
looks up the passages of the **base de conocimiento** most relevant to what
the clinician just wrote and gives them to the model, for that turn only, as
reference material. The clinician never sees the **contexto recuperado**, and
what the clinician says about the patient always wins over it.

Until the documents exist, the app works without RAG exactly as it does today.
If documents are there but can't be indexed or searched, the turn fails with
the usual error bubble rather than quietly triaging without the protocol.

## User stories
1. As a clinician, I start a case and interview with the AI exactly as before;
   nothing on screen tells me the model changed.
2. As a clinician, when Ollama isn't running or the model isn't pulled, I get
   the usual error bubble — and on the opening turn, **Reintentar**.
3. As a clinician, a slow local reply keeps the typing indicator up until it
   arrives; there is no timeout.
4. As a clinician, a turn where the model produced no valid JSON block leaves
   the panel as it was, with no error; the next valid turn brings it up to date.
5. As a clinician, a long interview does not make the AI forget how the case
   started.
6. As a clinician, after I describe the patient, the AI's reading reflects the
   relevant passages of the Manchester protocol, without the passages appearing
   anywhere in the thread or the panel.
7. As a clinician, if a retrieved passage contradicts what I said about the
   patient, the AI goes by what I said.
8. As a clinician, a turn whose text matches nothing in the protocol closely
   enough gets no context at all rather than unrelated passages.
9. As a clinician, the opening turn and **Reintentar** never search the
   protocol.
10. As a clinician, pressing **Iniciar caso** starts indexing in the background
    alongside the opening turn, so my first message usually doesn't wait for it;
    if I write before it finishes, that turn waits for it.
11. As a clinician, if indexing or the search fails, my turn ends in the error
    bubble; the next turn tries again from scratch, and keeps failing visibly
    until the documents or the embedding model are fixed.
12. As the operator, with `knowledge/` missing or empty the app works without
    RAG and the server console says so.
13. As the operator, I drop `.md`/`.txt` files into `knowledge/` and the next
    case reindexes them; with no change to the folder, a server restart reuses
    the index on disk instead of re-embedding everything.
14. As the operator, a failed indexing run never leaves a half-built index
    behind to be reused.
15. As the operator, I configure the Ollama URL, chat model, embedding model and
    context window through environment variables; no API key is needed.

## Decisions
- Ollama only, through LlamaIndex.TS and `@llamaindex/ollama`; Gemini,
  `@google/genai`, `@llamaindex/google` and `GEMINI_API_KEY` are removed —
  ADR 0008, superseding ADR 0004.
- `@llamaindex/ollama` is added only after confirming it shares
  `@llamaindex/core` with `llamaindex@0.12.1`; if that requires bumping
  `llamaindex`, stop and ask first — ADR 0008, `llamaindex-version-lock`.
- Chat model `llama3.2:3b` on the same machine as Next, temperature 0, explicit
  `num_ctx` defaulting to 8192 — ADR 0008.
- Configuration: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_EMBED_MODEL`
  (default `bge-m3`) and the `num_ctx` value — ADR 0008, ADR 0009.
- Errors reuse the existing error bubble and **Reintentar**; no timeout, no
  streaming — ADR 0008, ADR 0002.
- A turn with no valid JSON block is accepted per ADR 0003 — no retry, no
  visible error — ADR 0008.
- The recommendation contract, the per-turn instructions, the accumulation rule
  and the panel's reconciliation are unchanged — ADR 0003, 0005, 0007.
- Base de conocimiento: `.md`/`.txt` files of the Manchester protocol in
  `knowledge/`; no PDF — ADR 0009.
- The index lives on disk in `.rag-index/` (gitignored) and is rebuilt only when
  a hash of `knowledge/`'s contents changes. It is shared by every case;
  **Descartar caso** and the session reset don't touch it — ADR 0009.
- Indexing starts at **Iniciar caso**, in parallel with the opening turn; a
  clinician turn that needs the index waits for it — ADR 0009.
- Retrieval uses only the clinician's own text, never the instructed message;
  done by hand rather than through `ContextChatEngine`'s built-in retrieval —
  ADR 0009.
- No retrieval on the opening turn or **Reintentar** — ADR 0009.
- Chunks of ~512 tokens with 50 overlap, top 3, filtered by a similarity
  threshold; all three are constants in code — ADR 0009.
- Contexto recuperado goes in as a system message for the current turn only and
  never enters the chat history — ADR 0009.
- The model is told the context is reference material: what the clinician said
  wins, and irrelevant passages are ignored — ADR 0009.
- Missing or empty `knowledge/` means no RAG plus a console warning; a failure
  to index or embed means the error bubble, and no partial index is persisted —
  ADR 0009.
- RAG is invisible to the clinician; no `fuentes` field — ADR 0009, ADR 0003.

## Testing
There is still no test runner in the repo (`check` in `CLAUDE.md` is a TODO,
`package.json` has only `lint`), so there are no similar tests to follow. This is
the same open question the previous specs recorded.

Seams, preferring behavior over implementation:
- **`chat()` / `openCase()` / `retryOpenCase()` with the LLM and embedding
  model stubbed:** the same `{ response, recommendation }` shape as today; the
  opening turn and the retry never call the retriever; a clinician turn calls it
  with exactly the clinician's text; retrieved context reaches the model on that
  turn and is absent from the history the next turn sends; a provider error
  rejects so the UI shows the error bubble.
- **Index build, over a temp folder with a fake embedding model:** empty or
  missing folder means no index and a warning; an unchanged folder reuses the
  persisted index without embedding; a changed file triggers a rebuild; an
  embedding failure persists nothing.
- **Retrieval:** fragments below the threshold are dropped; zero passing
  fragments means no context message at all.
- **Manual, against a real Ollama:** an interview of 10+ turns still carries the
  opening `motivo` (checks that `num_ctx` is enough); with Ollama stopped, the
  error bubble shows.

## Out of scope
- Gemini or any other provider, and a provider switch.
- Streaming, timeouts, or auto-retry of turns.
- Uploading documents from the UI; PDF or any format other than `.md`/`.txt`.
- An external vector database.
- Showing sources or citations to the clinician; any change to the JSON contract.
- Folding the case's `motivo` into the retrieval query.
- Writing or sourcing the Manchester protocol documents themselves.
- Per-case chat sessions; the module-level singleton debt stays as it is.
- Any change to the clinician-facing UI.

## Open questions
- **Similarity threshold value.** Fixed as a mechanism (ADR 0009) but with no
  number; it has to be calibrated against the real documents, which don't exist
  yet. Until then the implementation needs a placeholder value, marked as such.
- **ADR 0004 has no supersession note.** ADR 0008 says it supersedes 0004, but
  0004 doesn't say so itself. Adding a line there could be part of the first
  ticket.
- **`CONTEXT.md`'s Iniciar caso entry** says it resets the session and sends the
  prompt inicial; it now also starts indexing. Update the definition or leave
  that as implementation detail?
- **Test tooling.** Still nothing in the repo; adding a runner needs your
  approval per `CLAUDE.md`.
