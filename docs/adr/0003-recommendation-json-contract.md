# 0003 — Recommendation JSON contract, embedded in the chat reply

## Decision
`chat()` asks the model for two things in a single call: the clinician-facing
prose reply, followed by a fenced ` ```json ` block holding the recommendation
data. The instruction describing this format — including the contract below —
is appended to every clinician message before it is sent, not configured once
as a system prompt, because the recommendation is recomputed on every message
(ticket 08) and the instruction must therefore accompany every turn regardless
of which chat engine is active.

`chat()` returns `{ response, recommendation }`. `response` is the prose found
before the JSON block. `recommendation` is the parsed-and-validated object, or
`null` when no JSON block can be located or parsed at all.

### Contract
```json
{
  "motivo": "string",
  "antecedentes": "string",
  "signosVitales": [
    { "label": "string", "value": "string", "unit": "string" }
  ],
  "nivel": "rojo | naranja | amarillo | verde | azul",
  "confianza": 0,
  "razonamiento": ["string"],
  "informacionFaltante": ["string"],
  "proximosPasos": ["string"]
}
```
`signosVitales` holds up to five entries. `nivel` is one of the five Manchester
keys (CONTEXT.md) — a value outside that set is rejected, never coerced to the
nearest level or defaulted. `confianza` is the model's own self-reported
number, not a calibrated probability. Patient identity is **not** in the
contract — the model is never asked to supply it and must not invent it.

### Validation
Each field is checked independently; a field that is missing or fails its own
check is dropped rather than defaulted, so the rest of a partially-valid object
still comes through. `recommendation` as a whole is `null` only on a total
parse failure — no JSON block found, or it doesn't parse as an object at all.
Reconciling a partial or `null` recommendation with whatever the panel is
currently showing is the panel's job (ticket 08, follow-up session), not
`chat()`'s.

## Why
The conversational slice (ticket 07) already proved a single `chat()` call
end to end; keeping the prose and the structured recommendation in that same
call keeps them consistent with each other and avoids a second model
round-trip's latency and failure mode. `parseJsonMarkdown` — already exported
by `llamaindex` — is built for exactly this prose-plus-fenced-JSON pattern,
which is the idiomatic path in this stack rather than a bespoke one.

Rejecting an invalid `nivel` instead of coercing it is a direct read of the
ticket's "keep the human in the loop" note: silently substituting a level the
model didn't actually produce would look like a real suggestion.

## Rejected
- **A second dedicated call for the structured data** — keeps the chat reply
  fast and lets the panel update on its own cadence, but doubles the model
  round-trips and lets prose and structure drift apart. Deferred, not ruled
  out permanently if latency becomes a problem.
- **Gemini's native JSON response mode** (`responseMimeType:
  "application/json"`) — forces the *entire* completion to be JSON, which
  would drop the clinician-facing prose from the same call. Would only work
  paired with the two-call approach above.
- **A schema-validation library (e.g. zod)** — would fit this well, but adding
  a dependency needs to be asked for first (project rule); a hand-rolled
  per-field validator costs nothing extra to add.
- **Coercing or defaulting an invalid `nivel`** — a fabricated or
  nearest-match level would read as a real model suggestion instead of a
  validation failure, undermining the human-in-the-loop requirement.

## Amendment — a bare trailing JSON object is also accepted (ticket 11)
The instruction still asks for a fenced ` ```json ` block, and a fenced block
is still what `chat()` looks for first (the last one wins). When there is none,
it now also accepts a **bare JSON object that runs to the end of the reply**:
the earliest `{` whose remainder parses as JSON is taken as the block, and a
`---` separator left just before it is trimmed off the prose. "No JSON block
found" above therefore means neither a fenced block nor a trailing object.

**Why:** `llama3.2:3b` under ADR 0008 does not reliably follow the fence rule.
Against the real model the same instruction gave a fenced block in one run and
a bare object after `---` in the next. With fence-only parsing, every slip
blanked the panel and printed the raw JSON in the AI bubble where the clinician
reads it. Per-field validation is unchanged, so the empty strings and empty
arrays such a model writes for unknown fields are still dropped, never shown.

**Not accepted:** JSON followed by more text, and anything that does not parse
as one complete object. Those stay "unavailable" rather than being repaired by
guesswork. This amendment does not make the model supply `nivel`; it only stops
a recommendation it did write from being lost or leaked.
