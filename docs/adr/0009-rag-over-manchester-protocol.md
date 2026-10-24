# 0009 — RAG over the Manchester protocol, retrieved per turn, never kept in history

## Decision
Each clinician turn after the opening one retrieves from an on-disk index of `knowledge/` (Manchester protocol, `.md`/`.txt`, embedded with `bge-m3`) using only the clinician's own text, and hands the fragments that pass a similarity threshold to the model as a current-turn-only system message that never enters the chat history.

## Why
`ContextChatEngine` retrieves with the full turn message, which carries ADR 0003's long JSON instructions and would drown the clinician's words, so retrieval is done by hand on the raw text; the opening turn and Reintentar skip it because ADR 0007's initial prompt carries no patient information to search with. Keeping fragments out of the history is what makes RAG fit inside ADR 0008's `num_ctx`: pasted into each message, three ~512-token fragments per turn would exhaust 8192 tokens within a handful of turns and Ollama would silently drop the start of the case. The fragments are reference material, not ground truth — what the clinician said about the patient wins over them, and they are invisible to the clinician, so ADR 0003's contract is untouched. The index persists in `.rag-index/` and is rebuilt only when a hash of `knowledge/` changes, with indexing started at Iniciar caso in parallel with the opening turn so the first clinician message doesn't pay for it. An empty or missing `knowledge/` is the normal state until the documents exist and runs without RAG; a failure to index or embed is shown as the error bubble instead, because silently triaging without the protocol when the protocol is supposed to be there is the worse failure. No partial index is ever persisted.

## Rejected
- **Retrieving with the full instructed message** (`ContextChatEngine` as-is) — retrieval polluted by the JSON instructions.
- **Retrieving with clinician text plus the last `motivo`** — better for short answers, but more moving parts; not chosen for now.
- **Keeping fragments in the history and raising `num_ctx`** — memory cost grows every turn for context that is only relevant to the turn it was retrieved for.
- **Uploading documents from the UI** — a new screen, validation and permissions for a corpus that changes rarely.
- **In-memory index** — re-embeds the whole corpus on every server start.
- **External vector DB (Chroma, Qdrant)** — another dependency and another service to run.
- **PDF support** — needs a PDF reader dependency; convert to Markdown instead.
- **A `fuentes` field in the JSON** — would amend ADR 0003; RAG stays invisible.
- **Degrading silently to no-RAG on indexing failure** — triages without the protocol while appearing to use it.
- **Indexing lazily on the first clinician message** — that message would wait for the whole corpus to embed.
