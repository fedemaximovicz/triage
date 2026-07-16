# TRIAGE-APP

## Stack
Typescript, NextJs 16.2.10, package manager: pnpm 11
Never add a dependency without asking.

## Commands
- Check everything: `TODO e.g. npm run check` (typecheck + lint + test)

## Docs
- Glossary: `CONTEXT.md`. Decisions: `docs/adr/`. Specs: `docs/specs/`.
  Tickets: `docs/tickets/`. Read the ones relevant to what you're touching.

## How we work
- One ticket per session. Propose a plan and wait for my approval before
  editing anything.
- Then one step at a time: make the change, show me, and stop. Finishing a
  step is not permission to start the next one.
- Ask before writing any file or running any command. Never batch unrelated
  changes into a single action.

## Hard rules
- NEVER run `git commit`, `git push`, or `git rebase`. I commit. Don't offer.
- If a step fails twice, STOP and present your hypotheses. Do not try a third
  variation on your own.
- If something fails for environment reasons (missing dependency, wrong
  runtime version, permissions, network), STOP and report. No workarounds,
  no installing anything unasked.
- Never weaken a test to make it pass — no editing assertions, no skipping,
  no widening tolerances. Fix the code, or ask.