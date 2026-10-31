# 25 — The similarity threshold is measured on embeddinggemma

Blocked by: none
Status: open

## Goal
`SIMILARITY_THRESHOLD` stops being a guess. A repeatable evaluation runs a set
of synthetic queries against the **base de conocimiento** with `embeddinggemma`
and shows what each candidate threshold lets through. The threshold is changed
only if those results support a value; if relevant and irrelevant fragments
don't separate, it stays as it is and the evidence says what to look at next.

## Acceptance
- The search can return fragments with their scores before the filter.
  `retrieveContext` still returns the same `string[]`, and a clinician turn
  behaves exactly as before.
- An evaluation set of about 30 synthetic queries lives outside `knowledge/`, so
  it is never indexed. It covers queries by topic with the document each should
  retrieve, off-topic queries that should retrieve nothing, and short replies
  such as «sí» or «desde ayer».
- The clinician has reviewed which document each query should retrieve before
  any result is used.
- One command runs the evaluation and reports, per query, the top `TOP_K`
  documents with their scores, the top-3 hit rate, and, for each threshold from
  0.3 to 0.7, how many expected fragments pass and how many irrelevant ones
  get through.
- The report shows the model it ran with, and running it twice over the same
  corpus and model gives the same scores.
- The evaluation contains no real patient data.
- The results are shown to the clinician before `SIMILARITY_THRESHOLD` changes,
  and the clinician picks the outcome:
  - **They separate:** `SIMILARITY_THRESHOLD` takes the chosen value, the
    `PLACEHOLDER` note goes, and the method and results are recorded in a new
    ADR that the ADR index lists.
  - **They don't:** the threshold and its `PLACEHOLDER` note stay, and the
    findings are recorded in this ticket's Notes.
- `docs/guia/06-rag.md` and `docs/guia/08-desarrollo-y-diagnostico.md` describe
  the threshold's status and how to rerun the evaluation.
- Typecheck and lint pass; a clinician turn works in the browser without console
  errors.

## Notes
- ADR 0009 is the decision record for retrieval, and ADR 0012 for the model.
  Both record the threshold as uncalibrated.
- No new dependency. Whether `src/lib/rag.ts` runs outside Next.js as it stands
  is unverified; propose how before writing the script.
- Needs a running Ollama with `embeddinggemma` pulled. If that or the runtime
  fails, it is an environment problem: stop and report it.
- Run the evaluation with the same chunk size, overlap and `TOP_K` as the app.
  A corpus or model change means running it again.
- `SIMILARITY_THRESHOLD` is not in the index hash, so changing it needs no
  rebuild.
- Results may point at causes the threshold can't fix: `throwaway-manchester.md`
  and `22_CONTRATO_RAG.md` competing with clinical documents, YAML headers being
  indexed, or short replies being searched without the interview. Report them;
  don't fix them here.
- This measures whether the search finds the right text. It is not clinical
  validation, and much of the corpus is still `borrador_no_validado`.

## Out of scope
- Changing the corpus, chunking, `TOP_K` or what is sent to the model.
- Adding the interview or the last `motivo` to the query (rejected for now in
  ADR 0009).
- Reranking, approval filters or showing sources in the UI.
- Choosing test tooling (still unchosen; spec open question).
