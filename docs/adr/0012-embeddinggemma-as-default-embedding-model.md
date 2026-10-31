# 0012 — embeddinggemma is the default embedding model

## Decision
The default for `OLLAMA_EMBED_MODEL` is `embeddinggemma`, in `src/lib/rag.ts` and `.env.example`, superseding the `bge-m3` named in ADR 0009. The rest of ADR 0009 stands.

## Why
`embeddinggemma` is the model the project runs on, but only through a gitignored `.env.local`: a fresh clone got `bge-m3` instead, and the repository described a setup nobody was using. Making it the default means the code, the documentation and the running app name the same model.

## Rejected
- **Keeping `bge-m3` as the default and leaving `embeddinggemma` as a local override** — the guides would stay accurate, but a fresh clone would keep retrieving with a different model from the one in use.
- **Rewriting ADR 0009, ticket 17 and the spec** — they record what was decided at the time; this ADR and the ADR index carry the change.

## Notes
- The index hash includes the model name, so an installation that moves to the new default rebuilds its index the next time it is refreshed. It needs `ollama pull embeddinggemma` first; a missing model ends the turn in the error bubble (ADR 0009).
- `SIMILARITY_THRESHOLD` (0.5) is still an uncalibrated placeholder, and it has not been measured for this model.
