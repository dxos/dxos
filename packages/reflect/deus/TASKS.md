# DEUS — Task Ledger

Project: `deus` · Design: [docs/DESIGN.md](./docs/DESIGN.md) · Idioms: [docs/IDIOMS.md](./docs/IDIOMS.md)

_Resume: Phase 1 (Deus.QA) materialized 2026-08-23 — dialect, DESIGN section, execution skill, and
a verified flow. Next: APP.mdl, then re-run QA-1 through the skill to test the contract itself._

## Goal

Extend DEUS with a **QA dialect** so a `.mdl` spec doubles as a test plan that a human tester
and an agent tester execute from the same source. Flows live in a `## QA` section of each
`PLUGIN.mdl`; cross-plugin journeys live in a new `packages/apps/composer-app/APP.mdl`.

### Major goal — the QA routine

Part (c) has a front door: `/dxos:qa run <flow>`. Parts (a) and (b) do not yet.

A Claude routine (skill + command) that closes the loop for any plugin:

- [ ] **(a) Update the plugin's `PLUGIN.mdl`** from its source — reconcile `type`/`op`/`component`
      blocks against the code, backfill `key:` and `requires:` on every `op` from its
      `Operation.make({ meta.key, services })`. **Blocked on a binding decision first:** the mapping
      is not one-to-one. markdown's single `op create` covers two runtime operations with different
      keys and services, and chess's `startGame` has no runtime counterpart at all. A single
      `key?: NSID` cannot express either. Split the spec operation, or define one-to-many binding
      semantics, before writing the reconciler.
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

### Spike — DONE 2026-08-23

- [x] One flow authored in `plugin-markdown/PLUGIN.mdl` `## QA`.
- [x] Agent-startable debug port (`DX_DEBUG_PORT` → `serve-qa` → `temp/debug-port.json`).
- [x] `QA-1` executed end to end against a live dev server. **All 4 steps pass**, no human in the
      loop: the agent started the server, read the session from the sidecar, and drove the port.
- [x] Verdict: **the block shape survives contact.** `do`/`expect`/`invoke`/`assert`/`capture` were
      each load-bearing; nothing in the shape had to change. What changed is content — see Findings.

### Then

- [x] `BLOCK_TYPES += 'flow'` in [src/extension/constants.ts](./src/extension/constants.ts).
- [x] Backfill `key:`/`requires:` on the markdown ops the flows reference.
- [x] `lang/qa.mdl` — the `Deus.QA` dialect (`ext flow`, `ext step`), encoding Findings 1-3.
- [x] `docs/DESIGN.md` — `Deus.QA` section.
- [x] `.agents/skills/running-qa-flows/SKILL.md` — the agent-side execution contract, including the
      always-use-the-invoker rule and the built navigation path.
- [x] `/dxos:qa` command in the `dxos` plugin — `list` / `show` / `run [--skip-cleanup]`, backed by
      `scripts/list-flows.mjs`; execution defers to the `running-qa-flows` skill.
- [x] More flows: markdown QA-2 (link one page to another) and QA-3 (a contributed slash command);
      chess QA-1 (start a game, play the opening, reject an illegal move).
- [ ] Run QA-2, QA-3 and chess QA-1 — all three are `status: unverified`.
- [ ] `packages/apps/composer-app/APP.mdl` — cross-plugin journeys.
- [x] Re-run `QA-1` through the skill (rather than by hand) — 2026-08-23. 4/4 pass, and the
      exercise paid for itself: three defects found, all in artifacts I had just written (below).
- [x] Re-run again after the `steps:` list rewrite — 2026-08-23, 4/4 pass, clean. No new findings:
      `given` (including the artifact-absence clause) held, the coalescing note was followed, the
      exact-match key resolution worked for both `[op:…]` references, `$result` read correctly, and
      `cleanup` ran. Three consecutive runs, no regression.
- [ ] More markdown flows: the versioning/suggestion arc (F-8 to F-10) is the part with no
      cheap test coverage and the most to gain.

## Findings

From running `QA-1` on 2026-08-23. Numbers 1-3 are language findings; 4-6 are defects in the
surrounding tooling that the flow surfaced.

1. **`requires:` is necessary but not sufficient to predict runnability.** The flow's `note:`
   correctly predicted step 4 (`update`, `Database.Service`) needed the operation-invoker escape
   hatch, and missed that step 2 (`addObject`) needs it too. A step can fail on a _downstream_
   op's services, which the op's own declaration cannot express.
   → **Simplification worth adopting:** have the runner ALWAYS invoke through the invoker with a
   `spaceId`, rather than branching on `requires:`. That makes `requires:` informational and removes
   a whole class of "which path does this step take" reasoning.
2. **Cross-plugin ops appear inside plugin-scoped flows**, not only in `APP.mdl`. `QA-1` references
   `space.addObject` and `layout.open`, neither declared in markdown's `PLUGIN.mdl`, so `[op:…]`
   could not resolve and there was no `requires:` to warn from. Full-key literals for foreign ops
   work; the `covers:`/reference lint must tolerate them.
3. **Coalescing steps 1-2 was correctly predicted.** A live ECHO object cannot cross the port's
   serialization boundary, so the runner must batch adjacent steps that thread one. Human step
   granularity and snippet granularity are genuinely different things.
4. **`addObject` does not return `subject`.** Its output schema is `{ id, object }`. The
   `composer-debug` skill §5 documents `{ id, subject, object }` and instructs feeding
   `added.subject` to `layout.operation.open` — stale, and it cost a retry. The working form is a
   built path: `root/<spaceId>/content/collections/<objectId>`. Skill corrected.
5. **plugin-debug is disabled by default in a plain local `serve`** (`isDev` is only true for the
   dev cloud env or `DX_DEV=true`), so routing port auto-start through it made the flag silently do
   nothing. The port belongs to `@dxos/client`; it now starts from `main.tsx`.
6. **Steps 2 and 3 of `QA-1` asserted true BEFORE the flow ran.** The previous run's skipped
   `cleanup` left a "QA Notes" document behind, and both asserts were existence-shaped
   (`some((o) => o.name === 'QA Notes')`, `innerText.includes('QA Notes')`) — so each would have
   reported pass having done nothing. Proved by evaluating them against the untouched fixture.
   → Asserts are now identity-shaped; `given` names the absence of the flow's own artifacts; the
   rule is Execution Rule 5 in `qa.mdl` and a step in the skill's §3.
7. **The skill's `invokeOp` helper matched keys by `endsWith`** — which matches both
   `org.dxos.operation.markdown.create` and `org.dxos.operation.markdown.createDraft`, the exact
   ambiguity `key:` was introduced to remove. Now an exact match that fails unless there is exactly
   one hit (Execution Rule 6).
8. **The skill never said to read the flow first.** It went from consent straight to starting a
   server, so a step's `note:` — which is a constraint, not commentary — could be missed. Now §1.
9. **`cleanup` was prose, so the two actors diverged — and the agent's path was the wrong one.**
   `cleanup: - delete the "QA Notes" document` named no mechanism, so a human uses the navtree
   delete action (which routes through `space.removeObjects`) while the runner reached for
   `space.db.remove`. The latter leaves a plank pointing at a deleted object, which per the
   handler's own comment "cannot be closed by the user". Found by the user looking at the app after
   a run that reported 4/4 pass and clean cleanup.
   → `cleanup` is now a `StepList` with `invoke:`/`expect:`/`assert:` like any other step
   (Execution Rule 7). Confirmed against the app: `removeObjects` returns
   `wasActive: [<path>]` and the plank closes.
   The general lesson: **any part of a flow without a dual face will diverge.** `cleanup` was the
   one field still prose-only, and that is exactly where it broke.
10. **Skipping cleanup is now a documented run option** (Execution Rule 8, skill §6) — inspecting
    the final state is a legitimate reason to leave the artifacts, provided the runner reports what
    remains and how to remove it.
11. **Authoring three more flows produced two more instances of the `key:` gap, and one worse case.**
    plugin-chess declares `startGame`, `submitMove`, `resignGame`, `getLegalMoves`, `validateMove`,
    `applyMove` — of which only `submitMove` has a runtime counterpart
    (`org.dxos.operation.chess.move`). `startGame` has NONE: a game is built with `Game.make` and
    placed with `addObject`, so an agent cannot start one through an operation at all. Chess QA-1
    is `actors: human` for that reason, recorded on the step rather than hidden.
    → Strengthens the case for routine part (a): every one of these was found by hand.
12. **CodeMirror does not observe synthetic input**, so an agent cannot open the `/` popup. Tried
    `computer.type`, key events, and `beforeinput`/`input` dispatched at `contentDOM`; each inserted
    the character without opening the menu. QA-3's first step is therefore human-only. The
    contributed operation itself IS agent-verifiable and was confirmed inserting into a live editor.
13. **`EditorViews.getByDocumentId` takes the DXN** (`echo://<spaceId>/<objectId>`), not the bare
    object id. Cost a round trip.
14. **`plugin-onboarding` fails to activate on a fresh dev profile** — `Schema not registered
Schema: org.dxos.type.document`. Not blocking (the default space and identity are still created)
    but it is an error on every cold boot of a new profile. Not investigated; logged for triage.

## Backlog

- [ ] **`req F-1.1:` inside `feat` has the same defect `step <n>:` had** — a positional/id pseudo-key
      is not core syntax (core declares block bodies as `key[?]: value`), it only survives because
      `fences.ts` has a regex that tolerates it, and it forces hand-renumbering. `flow` moved to a
      `steps:` list; `req` should follow. Deliberately NOT done here: it appears across all 92
      `PLUGIN.mdl` files, so it is its own change with its own risk.
- [ ] Lint the Extensions table against the block types a document actually uses. `plugin-markdown`
      used `flow` for a full day without declaring it, and pinned `op@1.0` while depending on
      `op@1.1`'s `key:` — core calls both a lint error, and nothing caught either.
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
