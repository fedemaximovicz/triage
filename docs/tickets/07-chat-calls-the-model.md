# 07 — Chat sends to the model instead of the canned reply

Blocked by: 06
Status: done

## Goal
`Chat.tsx` calls the `chat()` server action instead of faking a reply with
`setTimeout`. The clinician's message reaches Gemini and the real answer lands in
the thread. The recommendation panel is not touched.

## Acceptance
- Sending a message calls `chat()` from `src/app/actions.ts`; the AI bubble shows
  the model's text.
- The typing indicator shows while the request is in flight — driven by the
  actual pending call, not a fixed delay — and sending stays blocked until it
  settles. Ticket 03's guarantees (empty send is a no-op, no double send) survive.
- A failed call surfaces a visible message to the clinician and unblocks the
  composer. The UI never gets stuck in the analyzing state.
- Server-side conversation memory is reset when the client thread resets, so a
  reload cannot leave the model remembering a conversation the UI no longer
  shows. See the note below — this is a real hole, not a hypothetical.
- The recommendation panel does not change as a result of sending.
- Typecheck and lint pass; works in the browser without console errors.

## Notes
- **The reload hole.** ADR 0001 promises that reloading resets the screen to its
  seeded state, and that held while everything was client state. It no longer
  does: the chat engine in `actions.ts` is a module-level singleton on the
  server, so its memory outlives any reload. Without an explicit reset the
  clinician sees placeholder bubbles while the model silently carries the
  previous conversation — the two halves disagree and nothing on screen says so.
  `resetChatEngine()` already exists for this.
- `REPLY_DELAY_MS` and the canned `[respuesta IA]` are removed; this supersedes
  ticket 03.
- No streaming — server actions cannot send intermediate results (ADR 0002). The
  clinician waits for the whole reply, and real latency is seconds rather than
  the mockup's fixed 1.6s. If that reads as broken, revisit with a route handler.

## Open questions
- Do the four seeded placeholder bubbles stay? They made sense as a visual
  target for the static port; against a live model they are a conversation that
  never happened, and the model is not aware of them. Suggest dropping them and
  starting from an empty thread, but that changes the seeded look from ticket 02.

## Out of scope
- The recommendation panel reading anything from the model — ticket 08.
- Per-case chat history (the singleton stays), attachments, streaming, auth.
