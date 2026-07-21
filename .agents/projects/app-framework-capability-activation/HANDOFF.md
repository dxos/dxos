# Handoff — app-framework capability-dependency activation

_Last updated: 2026-07-19. Worktree: `/Users/jdw/.t3/worktrees/dxos/t3code-84a5cc44`, branch `t3code/84a5cc44`._

## TL;DR

The full refactor (phases 1–9) is **done and committed**. Phases 1–8 replaced
hand-wired activation events with capability-graph-derived activation and
deleted the legacy API. Phase 9 (user-directed) then reworked the day-to-day
authoring ergonomics on top of that: plugins are now a uniform chain of
`Plugin.addLazyModule`, per-capability sugar lives at the capability level
(`AppCapability` module makers) instead of the plugin level, and all ~89
plugin packages were swept onto it — `AppPlugin` itself is deleted.

**All gates are green and the only outstanding work is a decision on whether to
submit a PR.** The user previously said **"don't submit a pr"** — do NOT run
`gh pr create` or push unless the user changes that instruction. Gates: full-repo
build; full test suite (cli:test fixed via the node-barrel drift commit); boot
gate 3/3 with `failed: []`; composer-app e2e 22 passed / 17 skipped / 1 failed
where the single failure is the pre-existing `reset device` flake — DEBUG-traced
and confirmed NOT a regression (`onReset` fires and navigates identically on
pass/fail runs; the test races its own 45s `waitForRequest`).

## Current git state (verify before acting)

- Branch: `t3code/84a5cc44`. No upstream configured; **nothing has been
  pushed**. Working tree is clean — everything below is committed.
- Recent commits (newest first, phase 9 tail):
  - `4442a51dff` — plugins: mirror activatesOn/props specs into node capability
    barrels (fixes cli:test fresh-profile failures; root cause was drift in
    four plugins' node-only `#capabilities` barrels)
  - `7dd1c8d8a1` — composer-app: capability-activation module audit + deferral
    plan (`AUDIT.md` §12 + `AUDIT-modules.md`)
  - `e700f932c0` — phoenix: fix watchdog import after rolldown build layout
    change
  - `08e8245830` — app-toolkit: delete AppPlugin
  - `ef6796567a` / `43f62ff4a2` / `cfbb93adb1` — phase-9 sweep (waves 2, 1, and
    salvage) — all plugin packages onto capability module makers
  - `fd9b18e785` — app-framework: opaque `Capability.Module<Options>`;
    `activatesOn`/props move to the authoring site
  - `691710b77a` / `84b9e789ff` / `19812eb705` — phase-9 core + exemplars
    (arity flip, `AppCapability` makers, markdown/client exemplars)
  - `dd6ab97d56` — app-framework: delete legacy activation API (phase 8)

## What was done (phases 1–8, brief)

Design + per-phase ledger live alongside this file:

- `DESIGN.md` — full plan + the "REVISED ACTIVATION MODEL" section.
- `MIGRATION-BRIEF.md` — the per-plugin migration recipe + hard rules.
- `PHASE7-WORKLIST.md` — per-package inventory / event classification.
- `PHASE8-BRIEF.md` — the legacy-deletion spec + landing gates.
- `PHASE9-CORE-BRIEF.md` / `PHASE9-SWEEP-BRIEF.md` — phase 9 core rework spec
  and the sweep-agent brief.
- `TASKS.md` — per-phase progress, including the full phase 9 ledger.

Summary: phases 1–3 built capability tags + arity + contributions, the typed
module union, and the manager's dependency pass (waves, cycles, event
bridging). Phases 4–6 migrated core packages (app-framework common,
process-manager, app-toolkit) and the plugin-client worked example. Phase 7
migrated all ~89 remaining plugin packages. Phase 8 deleted the legacy
event-wiring API entirely (`fires*`/`compatFires`, the legacy Startup wave,
ordering-only events, `AppPlugin`'s legacy branch).

## What phase 9 changed (user-directed API ergonomics)

User direction: no explicit types where main had none; multi is the default
capability arity; per-capability sugar moves from the plugin (`AppPlugin.addXModule`)
to the capability (`AppCapability` module makers); plugins compose as a
uniform chain.

The final API shape, in one paragraph: `Capability.make<T>(nsid)` is a multi
tag by default, `Capability.makeSingleton<T>(nsid)` the singleton case.
A module body is authored via `Capability.lazyModule(name, spec, loader)`
(code-split) or `Capability.inlineModule(name, spec, body)` (eager); `spec`
carries `requires`/`provides`/`activatesOn` and an optional `props` mapping
from plugin options to body props. Both return an opaque `Capability.Module<Options>`
— parameterized only by its options type, so no module export leaks a
foreign capability's type into declaration emit (the TS2883 problem that
drove most of phase 9). Capability owners export a maker built with
`Capability.moduleMaker(name, tag)`, which bakes in the tag's default
`provides` so call sites don't repeat it. A plugin definition is then a flat
chain: `Plugin.define(meta).pipe(Plugin.addLazyModule(AppGraphBuilder), Plugin.addLazyModule(AppCapability.translations(translations)), ..., Plugin.make)`.
`AppPlugin.addXModule` and its 616 call sites are gone.

See `packages/sdk/app-framework/src/core/{capability,plugin}.ts` and
`packages/sdk/app-toolkit/src/app-framework/AppCapability.ts` (the `Maker<C>`
type alias there documents the TS2883 guard) for the exact types, and
`packages/plugins/plugin-markdown` / `plugin-client` as worked examples.

## Next steps (in order)

1. **All gates are green** (see the TL;DR and `TASKS.md`'s Phase 9 checklist).
   Nothing outstanding on the code.
2. **PR: only on explicit user go-ahead.** The `submit-pr` skill is ready to
   run (changesets already updated for the final phase-9 API — see
   `.changeset/app-toolkit-capability-makers.md` and
   `.changeset/capability-dependency-activation.md`). The user has said
   **do not submit a PR**; honor that until they say otherwise.
3. **Optional follow-ups** (not blocking) are listed in `TASKS.md` §Follow-ups:
   the startup-deferral plan (`composer-app/AUDIT.md` §12), three compiler-forced
   `Plugin.addLazyModule<void>` anchors, and the `Maker<C>` TS2883 guard.

## Known non-regressions (not caused by this work — do not chase)

- `basic.spec.ts > reset device` — intermittent e2e timeout. A/B-tested
  against a pre-refactor base commit; reproduces identically there.
- Composer boot: two benign `Error: Space is not initialized.` console errors
  on every run — pre-existing echo/client race.
- `plugin-meeting:test > modules activate on the expected events` — times out
  only under full-suite CPU contention; passes standalone.
- The pre-existing composer ResetDialog "System Error" startup race
  documented in `startup.spec.ts`.

## Hard rules (repo non-negotiables that bit us repeatedly)

- **No branches/worktrees.** Never `git checkout -b`, `git worktree add`,
  `git branch -m`. Work only in this assigned worktree.
- **No casts** to silence the type-checker (`as any`, `as unknown as T`, `!`).
  `as const` is fine; the few brand-boundary casts in `capability.ts` are
  documented and intentional.
- **Never pipe a gate command through `tail`/`head`** — it masks the exit
  code. Use `> log 2>&1; echo EXIT=$?`. Moon cache can report stale success;
  use `MOON_CACHE=off` to force a real run when a dist file looks wrong.
- **Commit nothing silently** — `git status` and account for every file
  first.
- Commit trailer: `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.

---

## RESUME (2026-07-21) — reopened for two API-ergonomics follow-ups

State: committed `e93156f8`, pushed to `claude/app-framework-capability-activation-0gaz6c`.
**UNBUILT / UNTESTED** — moon could not initialize (proto binary from GitHub release
assets 403'd by egress). First job on resume: build + test, then fix any fallout.

Two changes in the commit (full detail in TASKS.md "Reopened addendum"):
1. `Plugin.addLazyModule` dissolved into `Plugin.addModule` (overloads in
   `core/plugin.ts`; 167 call sites swept; 0 `addLazyModule` remain).
2. plugin-assistant gained a `workerd`-conditioned `#capabilities` →
   `src/capabilities/workerd.ts`; `AssistantPlugin.workerd.ts` no longer hand-writes
   `inlineModule` wrappers.

Validate: `moon run app-framework:build` + `:test`; `moon run plugin-assistant:build`
(workerd `#capabilities` resolution + check-module-structure); then
`moon exec --on-failure continue --quiet :build`; then `:lint` + `pnpm format`.
The novel risk is `addModule` overload resolution — watch for a call site the old
`addLazyModule` accepted but the merged overloads now resolve differently.

Env: fresh clone (`pnpm i` first). `moonrepo.dev`/`ghcr.io` reachable; GitHub
release-asset downloads (proto self-install) were 403 — verify that's fixed before
fighting the toolchain.
