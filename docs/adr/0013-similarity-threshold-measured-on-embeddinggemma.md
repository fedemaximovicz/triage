# 0013 — The similarity threshold is 0.30, measured on embeddinggemma

## Decision
`SIMILARITY_THRESHOLD` in `src/lib/rag.ts` is 0.30, replacing the uncalibrated placeholder of 0.5. It was chosen from `pnpm eval:similarity`, a repeatable run of the 31 synthetic queries in `evals/similarity-queries.ts` through the app's own search (`searchKnowledge`), with `embeddinggemma`, the same chunk size, overlap and `TOP_K` as the app. This ends the "uncalibrated" status recorded in ADR 0009 and 0012; the rest of both stands.

## Why
The set has 23 topic queries, each with the one document it should retrieve (reviewed by the clinician before any result was used), 4 off-topic queries and 4 short replies such as «sí» or «desde ayer», which should retrieve nothing. It runs against the 19 files in `knowledge/` and contains no real patient data. Two runs gave identical output.

Results of the run on 2026-10-31, as fragments passing each threshold out of those returned:

| Threshold | Expected (23) | Irrelevant, topic (46) | Irrelevant, off-topic (12) | Irrelevant, short reply (12) |
| --- | --- | --- | --- | --- |
| 0.30 | 21 | 23 | 0 | 0 |
| 0.35 | 15 | 13 | 0 | 0 |
| 0.40 | 11 | 5 | 0 | 0 |
| 0.45 | 6 | 0 | 0 | 0 |
| 0.50 | 6 | 0 | 0 | 0 |
| 0.55 | 1 | 0 | 0 | 0 |
| 0.60 or more | 0 | 0 | 0 | 0 |

The expected document was in the top 3 for 23 of 23 topic queries. Expected scores range from 0.163 to 0.553, irrelevant ones from topic queries reach 0.438, and off-topic and short-reply queries reach only 0.245. So relevant and irrelevant fragments overlap, and no threshold separates them cleanly; the choice is a trade-off. 0.30 keeps 21 of 23 expected fragments and rejects every off-topic query and short reply. 0.5 kept only 6 of 23. Missing the protocol text for a real presentation costs more in triage than receiving an extra fragment, and the model is already told that what the clinician says about the patient wins over the fragments (ADR 0009).

## Rejected
- **Keeping 0.5** — it lets through only the 6 clearest expected fragments.
- **0.35 to 0.45** — each loses more expected fragments (6, 10 and 15 fewer than at 0.30) to remove irrelevant ones that come from causes the threshold can't address.
- **Calling it a clean separation** — the ranges overlap; the numbers above are the evidence.
- **A value below 0.30** — not measured. The sweep stops at 0.30, so it is the lowest value this evidence supports, not necessarily the best one.

## Notes
- The two expected fragments below 0.30 are lost: `intox-ingesta` (0.163) and `embarazo-movimientos` (0.290).
- The irrelevant fragments that 0.30 lets through come from causes found here and not fixed: `throwaway-manchester.md` is in the top 3 of 11 topic queries, `22_CONTRATO_RAG.md`, `23_SALIDA_Y_PROMPT.md` and `24_VALIDACION.md` appear in the top 3 of 3 topic queries (for `mental-autolesion`, `24_VALIDACION.md` scores above the expected `17_SALUD_MENTAL.md`), and `neuro-acv` ranks `18_VULNERABILIDAD.md` above the expected document. The YAML headers are indexed as text. Short replies are searched without the interview (rejected for now in ADR 0009); they score 0.11 to 0.25 on their own.
- This measures whether the search finds the right text. It is not clinical validation, and much of the corpus is still `borrador_no_validado`.
- A corpus or model change means running `pnpm eval:similarity` again. `SIMILARITY_THRESHOLD` is not in the index hash, so changing it needs no rebuild.
