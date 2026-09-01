# 0007 — The AI opens the case by interviewing, one question at a time

## Decision
Starting a case sends a **fixed, hardcoded prompt** as the clinician's turn.
The prompt itself **never appears in the thread**: the clinician sees only the
AI's reply, as the first bubble of the conversation. The turn otherwise behaves
like any other — typing indicator, composer blocked until the reply lands.

The prompt instructs the model to **interview the clinician one question at a
time**, conversationally, rather than presenting a checklist of everything
triage needs. It never stops asking; from the **first turn that yields anything
useful** it also risks a provisional Manchester level and corrects it as the
picture fills in, instead of withholding a level until some threshold of
completeness is met.

The opening turn returns the **full JSON contract** like every other turn (ADR
0003). Most fields will be absent at first, which `validateRecommendation`
already handles field by field.

The prompt additionally requires the model to **repeat, in every JSON block,
everything it already knows about the case** — not only what the latest message
added. Case state accumulates **on the model's side**; the panel keeps replacing
its contents per turn exactly as ADR 0005 specifies.

If the opening call fails, the clinician gets the usual error bubble plus a
**Reintentar** button that re-sends the initial prompt. The button disappears
as soon as the clinician sends a message of their own. The case stays started
either way.

## Why
One question at a time is how the conversation actually goes at a triage desk,
and it is the format that survives a clinician who is holding a phone in one
hand: a wall of eight requested fields gets skimmed and half-answered, which
costs more turns than asking for the fields one by one in the first place.
Suggesting a provisional level early is the same instinct in the other
direction — a nurse who has said "dolor torácico, 68 años" is owed the model's
current reading of that, however soft, because a level that only appears once
the interview is complete arrives after the moment it was useful. ADR 0005
already built the visual language for exactly this: the provisional treatment
on the level card exists so an unconfirmed suggestion can be shown without
being mistaken for a decision.

The accumulation rule is the load-bearing one. ADR 0005's replace-per-turn was
written against a model that re-triaged on every turn, so "the latest reading"
and "everything known" were the same object. An interview made of many small
turns breaks that assumption: the model answers a question about breathing and
emits a JSON block with only `signosVitales` in it, and the panel drops the
`motivo` and `antecedentes` it had shown for the last four turns. There were two
ways out — accumulate in the panel, or make the model carry the state — and
accumulating in the panel is precisely the collage ADR 0005 rejected, where a
stale field and a fresh one sit side by side with nothing telling them apart.
Pushing the burden onto the model keeps the panel an honest snapshot of one
turn, and keeps the reconciliation logic in one verifiable place rather than
spread across a merge in the component.

Keeping the case started after a failed opening turn follows from what the
failure usually is: a missing key or a bad minute of network, not a reason to
throw away the case number and make the clinician start over. Retiring the
Reintentar button once they type is just honesty — by then the case has started
for real, and re-sending an interview opener into a conversation already in
progress would produce a second greeting.

## Rejected
- **Asking for everything in one opening message** — fewer round trips, but it
  reads as a form, which is the interaction model ADR 0001 rejected for this
  screen, and it gets half-answered.
- **Showing the prompt as a clinician bubble** — honest about what was sent, but
  it puts words the clinician did not write in their own voice, in a clinical
  record they are reading back.
- **Showing it as a distinct system note** — no false attribution, but it spends
  the top of every thread explaining the app's plumbing to someone triaging a
  patient.
- **A prose-only opening turn with no JSON** — simpler, but it makes the first
  turn a special case in `chat()` for no gain: the validator already copes with
  a block where nearly everything is absent.
- **Withholding the level until a minimum is met** (e.g. motivo plus one vital)
  — fewer wrong-looking suggestions, but it delays the model's reading past the
  point where it helps, and ADR 0005 already marks unconfirmed levels as
  provisional.
- **Accumulating in the panel instead of the model** — no prompt burden, but it
  reintroduces the cross-turn collage ADR 0005 rejected, and moves state into the
  component where it is hardest to inspect.
- **Cancelling the case on a failed opening turn** — clean, but it discards a
  case number and a start time over a transient error.
- **A permanently available Reintentar** — it would re-open an interview in the
  middle of a conversation that has already moved on.

## Notes
- The **exact wording** of the initial prompt is not decided here; it belongs to
  the spec and its ticket, along with where it lives in `actions.ts` next to
  `buildInstructedMessage`.
- The repetition requirement makes each JSON block grow with the case. No cap is
  imposed — ADR 0005 already rejected truncating clinical lists — but a very long
  interview is the place to watch for it.
- Depends on ADR 0006 for when the prompt is sent and for the session reset that
  must precede it.
