# DEUS — Task Ledger

Project: `deus` · Design: [docs/DESIGN.md](./docs/DESIGN.md) · Idioms: [docs/IDIOMS.md](./docs/IDIOMS.md)

_Resume: Phase 1 (Deus.QA) design agreed 2026-08-22. Spiking one markdown flow before
materializing the dialect._

## Goal

Extend DEUS with a **QA dialect** so a `.mdl` spec doubles as a test plan that a human tester
and an agent tester execute from the same source. Flows live in a `## QA` section of each
`PLUGIN.mdl`; cross-plugin journeys live in a new `packages/apps/composer-app/APP.mdl`.

### Major goal — the QA routine

A Claude routine (skill + command) that closes the loop for any plugin:

- [ ] **(a) Update the plugin's `PLUGIN.mdl`** from its source — reconcile `type`/`op`/`component`
      blocks against the code, backfill `key:` and `requires:` on every `op` from its
      `Operation.make({ meta.key, services })`.
- [ ] **(b) Propose candidate flows** — read `feat`/`req`/`test` blocks with no `covers:` pointing
      at them and draft flows that would exercise them, for human triage.
- [ ] **(c) Run the plan** — execute selected flows against a live Composer through the debug
      port and report a per-step pass/fail table.

Each part is independently useful; (c) is the one that needs the language to be right first.

## Phase 1: Deus.QA dialect

Design agreed (see DESIGN.md §Deus.QA once written). Decisions:

- `flow QA-n` blocks in a `## QA` section of each `PLUGIN.mdl`; `APP.mdl` for cross-plugin.
- `do:` + `expect:` required on every step (keeps flows human-runnable); `invoke:`/`assert:`
  optional (agent-only affordances); `capture:`/`$name` threads a step's result forward.
- `op@1.1` adds `key?: NSID`; the existing `requires:` is populated from the code's `services:`.
- Success criteria: prose `expect:` always, optional deterministic `assert:` snippet.
- Consent for mutating runs is at **flow granularity**, not per-operation.

### Spike (current)

- [ ] One flow authored in `plugin-markdown/PLUGIN.mdl` `## QA`.
- [ ] Executed against a live Composer via the debug port; findings recorded below.
- [ ] Decide from the findings whether the block shape survives contact.

### Then

- [ ] `lang/qa.mdl` — the `Deus.QA` dialect (`ext flow`, `ext step`).
- [ ] `docs/DESIGN.md` — `Deus.QA` section.
- [ ] `BLOCK_TYPES += 'flow'` in [src/extension/constants.ts](./src/extension/constants.ts).
- [ ] `.agents/skills/running-qa-flows/SKILL.md` — the agent-side execution contract.
- [ ] Backfill `key:`/`requires:` on the markdown ops the flows reference.

## Findings

_(spike results land here)_

## Backlog

- [ ] Grammar + lint for nested sub-blocks — `step 1:` and the existing `req F-1.1:` are both
      unvalidated today (the Lezer grammar parses key-values only).
- [ ] Coverage lint — `feat`/`req` with no `flow` covering them.
- [ ] `composer.invoke` does not forward `spaceId`, so `requires: [Database.Service]` ops need the
      operation-invoker escape hatch. Fix at the source or keep documenting the workaround.

## Backlog (from DESIGN.md "Open Questions")

- [ ] `req` as a standalone addressable block vs. inline-only inside `feat`.
- [ ] `db` vs `service` — does persistence deserve its own construct?
- [ ] Registry shape for URI resolution (JSON index? git repo of `.mdl`?).
- [ ] Extension versioning — can a doc pin `type@1.0` while a sibling uses `type@2.0`?
- [ ] Agent contract — the precise interface between a spec and an implementing agent.
