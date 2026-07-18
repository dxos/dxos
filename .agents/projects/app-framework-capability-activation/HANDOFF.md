# Handoff — app-framework capability-dependency activation

_Last updated: 2026-07-18. Worktree: `/Users/jdw/.t3/worktrees/dxos/t3code-84a5cc44`, branch `t3code/84a5cc44`._

## TL;DR

The full refactor (phases 1–8) is **done and committed**. The migration replaces
hand-wired activation events with capability-graph-derived activation, makes
capabilities yieldable Effect services, and deletes the legacy API entirely.
All gates were green when phase 8 finished (framework build+test, full-repo
build, full test suite, lint/format, Composer boot gate, **and the Composer
e2e suite** — the user's stated done-condition).

**The only outstanding work is finishing the merge fixup and deciding whether
to submit a PR.** The user explicitly said **"don't submit a pr"** — so do NOT
run `gh pr create` or push unless the user changes that instruction.

## Current git state (verify before acting)

- Branch: `t3code/84a5cc44`. No upstream configured; **nothing has been pushed**.
- Recent commits (newest first):
  - `75c8df5320` — Merge remote-tracking branch 'origin/main' (done by the submit-pr agent)
  - `7640c43330` — release: add changesets for capability-dependency activation
  - `dd6ab97d56` — app-framework: delete legacy activation API (phase 8)
  - `25c2d52b65` — plugins: final migration sweep — phase 7 complete
- **Working tree: 21 modified files, all uncommitted** (`git status --short`).

### What the 21 uncommitted files are

They are **new-API migrations of code that arrived via the `origin/main` merge**
(`75c8df5320`). Main had landed newer or still-legacy-API plugin code that
needed the same mechanical Phase-7 treatment. The submit-pr agent did that
migration to resolve the merge, but was **halted before committing**. Packages
touched: `plugin-blogger`, `plugin-typefully`, `plugin-progress`,
`plugin-markdown`, `plugin-inbox` (a story), `plugin-client`
(`space-replication-progress`). Representative diffs:

- `plugin-progress/src/ProgressPlugin.ts`: `activatesOn: ActivationEvents.SetupProcessManager`
  → `requires: []` + `provides: [Capabilities.TraceSink]`.
- `plugin-typefully/src/capabilities/index.ts`: `Capability.lazy(...)` →
  `Capability.lazyModule(name, { provides: [...] }, () => import(...))`, plus a
  TS2883 explicit-type-import with the `unused-imports/no-unused-imports` disable.

These changes look correct and consistent with the established migration
pattern, but **they were never gated after the merge** (build/test not re-run on
the merged tree). Before trusting them, re-run the gates (below).

## What was done (phases 1–8)

The design + per-phase ledger live alongside this file:

- `DESIGN.md` — full plan + the authoritative "REVISED ACTIVATION MODEL" section.
- `MIGRATION-BRIEF.md` — the per-plugin migration recipe + hard rules.
- `PHASE7-WORKLIST.md` — per-package inventory / event classification.
- `PHASE8-BRIEF.md` — the legacy-deletion spec + landing gates (sections A/B/C).
- `TASKS.md` — per-phase progress + session checkpoint.

Summary of the end state:

- **Phases 1–3** (Fable, main session): capability tags + arity + contributions
  - tagged errors (`capability.ts`, `errors.ts`); typed module union + builder
    (`plugin.ts`); the manager's dependency pass, waves, cycle handling
    (`plugin-manager.ts`).
- **Phases 4–6**: core capability arity flips, `AppPlugin` sugar helpers,
  process-manager migration, plugin-client worked example, testing utils.
- **Phase 7**: all ~89 plugin packages migrated (Sonnet agents against
  `MIGRATION-BRIEF.md`). Boot gate passed 3/3, `legacyRemaining: []`.
- **Phase 8** (`dd6ab97d56`): legacy API deleted — `fires*`/`compatFires`, the
  legacy Startup wave + waitFor bridge, the `'legacy'` ActivationSpec arm, dead
  ordering-only events (11 `*Events.ts` files removed), AppPlugin legacy branch.
  A real manager bug was fixed in the process: `_pullDependencyProviders` now
  traverses **multi-arity** requires when pulling on-demand providers for an
  event wave (previously only singleton requires), which fixed intermittently
  missing `LayerSpec` contributions in `ProcessManager`'s one-shot snapshot.
- Changesets (`7640c43330`): `@dxos/app-framework` minor (breaking API
  replacement) + `@dxos/plugin-markdown` patch (Group B lockstep representative).

## The new API (one-paragraph orientation)

Capabilities are arity-branded yieldable Effect tags:
`Capability.make<T>(nsid)` → singleton `Tag<T>` (`yield*` → `T`);
`Capability.makeMulti<T>(nsid)` → `MultiTag<T>` (`yield*` → live
`Contributions<T>`). A module declares `requires`/`provides` (dependency mode,
topologically ordered; no `requires` = startup root) or `activatesOn` + optional
`requires` (event mode, activates when a runtime event fires). `activate`
returns `Capability.provide(tag, impl)` / `provideAll(...)` contributions. The
type system enforces at the `addModule` site that `activate` only yields
declared requires and returns exactly the declared provides. See
`packages/sdk/app-framework/src/core/{capability,plugin}.ts` and the worked
example `packages/plugins/plugin-client/src/ClientPlugin.ts`.

## Next steps (in order)

1. **Decide on the merge fixup.** Either commit the 21 files (recommended message
   scope: `plugins: migrate post-merge code to capability activation API`) or,
   if the user prefers, review each diff first. Do NOT leave them dangling if the
   user wants to move on. Account for every file per the "commit nothing
   silently" rule.
2. **Re-run gates on the merged tree** (they have not been run since the merge):
   - `moon run app-framework:build && moon run app-framework:test`
   - `moon run app-toolkit:build && moon run app-toolkit:test`
   - full-repo build: `moon exec --on-failure continue --quiet :build > /tmp/build.log 2>&1; echo EXIT=$?`
     (NEVER pipe to `tail` — it masks the exit code)
   - full suite: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism > /tmp/test.log 2>&1; echo EXIT=$?`
   - `moon run :lint -- --fix` and `pnpm format`
   - Composer boot gate + e2e (see `PHASE8-BRIEF.md` §B for the headless
     playwright recipe; require `legacyRemaining: []`, `failed: []`).
3. **PR: only on explicit user go-ahead.** The `submit-pr` skill is ready to run
   (title `app-framework: capability-dependency activation`; changesets already
   in place; no Linear issue). The user last said **do not submit a PR** — honor
   that until they say otherwise.

## Known flakes (not regressions — do not chase)

- `basic.spec.ts > reset device` — intermittent e2e timeout. A/B-tested against
  base `25c2d52b65`; reproduces identically at base (~3/5 pass). Pre-existing.
- Composer boot: two benign `Error: Space is not initialized.` console errors in
  every run — pre-existing echo/client race, `failed: []` regardless.
- `plugin-meeting:test > modules activate on the expected events` — timed out
  only under full-suite CPU contention; passes standalone in ~5.8s.
- The pre-existing composer ResetDialog "System Error" startup race documented
  in `startup.spec.ts`.

## Hard rules (repo non-negotiables that bit us repeatedly)

- **No branches/worktrees.** Never `git checkout -b`, `git worktree add`,
  `git branch -m`. Work only in this assigned worktree.
- **No casts** to silence the type-checker (`as any`, `as unknown as T`, `!`).
  `as const` is fine; the few brand-boundary casts in `capability.ts` are
  documented and intentional.
- **Never pipe a gate command through `tail`/`head`** — it masks the exit code.
  Use `> log 2>&1; echo EXIT=$?`. Moon cache can report stale success; use
  `MOON_CACHE=off` to force a real run when a dist file looks wrong.
- **Commit nothing silently** — `git status` and account for every file first.
- Commit trailer: `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
