# plugin-variant-dedup — tasks

Research phase (PR #12610) — see DESIGN.md for the full report and recommendation (O2:
single canonical entry + generated stub barrels).

## Phase 0 — research (this PR)

- [x] Map current variant landscape (36 plugins, ~123 files, six sync points; drift audit — see DESIGN.md §4.2; the `spikes/` prototype that produced it was removed after Phase 3 verified clean)
- [x] Enumerate candidate mechanisms (O1–O5, DESIGN.md §3)
- [x] S1: bundler DCE fixture — invalidates O4 under `sideEffects: true` + source-mode consumers; negative control proves runtime `environments` opts are never tree-shakeable
- [x] S2: generator prototype + equivalence comparison (20/23 exact; 2 handwritten bugs; 1 deliberate rewrite → escape hatch)
- [x] S3: O2 end-to-end on plugin-markdown + plugin-space (build, traces + positive control, lint, check-module-structure, tests, edge-sim bundle — all green)
- [x] Draft PR with spike commits + report

## Phase 1 — decision + framework groundwork

- [x] User sign-off on O2 (Josiah, 2026-08-15: "let's move forward with implementing phase 1 and 2"); §6 Q1 (stale schema lists) and Q2 (inbox lazy→inline) remain open for migration
- [x] `environments` field on `ModuleSpec`/`Module`/`MakerOptions` + value-based AppCapability helpers (schema, translations, pluginAsset, commands)
- [x] `Plugin.addModule(undefined)` skip + unit tests (skip path, metadata carriage)

## Phase 2 — generator productization

Naming (Josiah, 2026-08-15): the bin is `dx-plugin` — the plugin-authoring CLI shipped with
@dxos/app-framework; generation runs as `dx-plugin gen`, future tooling (exports/#plugin
sync, scaffolding) becomes subcommands. Common task definitions live in the `composer-plugin`
moon tag (.moon/tasks/tag-composer-plugin.yml) so plugins don't repeat prebuild/build/test/lint
wiring.

Decisions (Josiah, 2026-08-15): generation runs in the plugin's `prebuild` moon task with
declared `outputs`; generated barrels are gitignored, not committed; `test` depends on
`^:prebuild` (dependency packages' generated sources must exist), defaulted in the shared
test tags rather than per-plugin; the generator ships with `@dxos/app-framework` as a
distributed binary (pattern must work for out-of-repo plugin authors), following the
`compile-plugin`/`./vite-plugin` precedent in that package. No CI freshness check needed —
the task graph owns it (echo-query `prebuild-lezer` is the template).

- [x] `dx-plugin` in `@dxos/app-framework` (`src/plugin-cli/`, `compile-plugin-cli` moon task via dx-compile, `bin/dx-plugin.mjs`); annotation-driven AST slicing; `typescript` resolved at runtime from the target package/workspace (no runtime dependency added)
- [x] Tool syncs the package.json `#capabilities` condition map (source → `gen/` paths, normalized dist conditions) — `#plugin`/exports/vite-entry ownership remains a follow-up
- [x] Headless barrels + stubs with GENERATED headers; `overrides.<env>.ts` splice (spliced as re-exports, exercised by plugin-space's Schema)
- [x] `prebuild` task wiring: per-plugin `prebuild` with declared outputs + build/test/lint deps; optional `^:prebuild` dep added to `.moon/tasks/tag-ts-test{,-storybook,-workerd}.yml` (alongside `^:build` until the source-reading direction removes it)
- [x] Emit into `src/capabilities/gen/`; repo-wide `**/src/capabilities/gen/` gitignore
- [ ] Fresh-clone/non-moon entrypoints: ensure `DX_SOURCE=1` bun and bare vitest/IDE runs have a documented `moon run :prebuild` path (or wrapper-script trigger)
- [x] `pkg-lint`: `import-source-missing` exempts `/gen/` source paths (task graph owns their existence); `pack` → `build` → `prebuild` covers tarballs
- [ ] pkg-lint rule: annotations ⇒ matching `#capabilities` conditions exist (superseded in part by the tool writing the map itself)
- [ ] TODO(wittjosiah): Roll `dx-plugin` into the `dx` cli? Once we stop shipping non-core plugins bundled into the cli it might be light weight enough to support this use case.

## Phase 3 — migration (mechanical, incremental; spike commits are the template)

- [x] Annotate + collapse the 2 spiked plugins onto the generator: hand-written stub barrels deleted, `environments` annotations in canonical barrels, prebuild tasks wired, space's byte-identical `schema.node/workerd` merged into `schema.headless.ts` behind `overrides.{node,workerd}.ts`, vestigial `#capabilities/node` subpath removed. Note: regeneration intentionally fixed space's node-barrel drift (`OperationHandler` back on Startup wave, `UndoMappings` maker form restored)
- [x] Sweep remaining 34 plugins; delete `plugin.node.ts`/`plugin.workerd.ts`, collapse `#plugin` conditions, prune vite entries — all 34 converted (parallel agent batches + 4 handled directly: plugin-review/script/sheet/thread), zero plugins remain on the old variant pattern (verified by repo-wide scan)
- [x] Merge byte-identical `schema.node.ts`/`schema.workerd.ts` → `schema.headless.ts`; surface the 4 stale schema lists for a human call — no `schema.node.ts`/`schema.workerd.ts` files remain anywhere in `packages/plugins`
- [x] Fix the `OperationHandler` Startup→Idle drift in space/client/routine node barrels (regeneration does this; verify boot behavior) — space fixed in the Phase 3 spike; client and routine fixed during the sweep (both verified via `plugin.test.ts`'s "modules activate on the expected events")
- [x] Resolve inbox lazy→inline workerd conversion (keep via override or revert) — inbox's canonical barrel carries `environments` annotations directly with `overrides.node.ts`/`overrides.workerd.ts` for the schema-list divergence; no lazy→inline conversion was needed
- [x] Found and fixed a generator gap: plugins with zero `environments`-annotated modules for an environment produced no `gen/<env>.ts` barrel, leaving that `#capabilities` condition unconditioned and falling through to the dangerous default (full browser barrel, React included) under node/workerd resolution. Fixed the generator to treat an `overrides.<env>.ts` marker file's presence as a signal to still emit a stubbed barrel (plugin-map-solid, plugin-wnfs, plugin-debug, plugin-devtools all needed the marker); separately found and fixed several plugins whose package.json `#capabilities` was stale/unconditioned despite having real `environments` annotations (plugin-assistant, plugin-game, plugin-illustrator, plugin-observability, plugin-chess-com) — re-running `dx-plugin gen` after rebuilding the CLI resynced all of them. A repo-wide scan across all 90 plugin packages confirms zero remaining gaps.

## Phase 4 — hardening

- [ ] Extend `check-module-structure` coverage to plugins that lack it but have variants
- [ ] Fix `toolbox lintPackageExports` nested-`source` flattening hazard
- [ ] Consider a workerd-pool smoke test that activates one collapsed plugin in the real workers pool

## Phase 5 — condition model correction (Josiah, 2026-08-15)

- [x] Drop the inert `'browser'` token: there is no `browser` condition (the canonical barrel is
      `default`), and the generator filtered it back out — a third of every annotation was
      ceremony. 127 annotations rewritten; omitting `environments` now means "do not split",
      not "browser-only"
- [x] `Environment` becomes an open string — conditions belong to the build tool resolving the
      package, not the framework (`deno`/`electron`/private conditions are equally valid)
- [x] Delete the 6 empty `overrides.<env>.ts` marker files; a plugin that contributes nothing to
      a runtime generates no variant, and headless hosts leave it out of their plugin list
- [x] Fix generator retraction: `generate()` returned before `syncPackageImports` when a plugin
      dropped to zero conditions, leaving `#capabilities` pointed at gen files no longer produced
- [x] Stop the generator authoring `#capabilities` for plugins that never declared one, and
      expanding a deliberate shorthand string into the conditional form
- [x] `dx-trace-imports --conditions` is repeatable, each occurrence an independent set; guards
      now trace exactly the conditions each plugin produces (25 dual, 4 node-only, 2 dropped)
- [x] Fix the React leaks the corrected guards exposed, all pre-existing on main:
      plugin-presenter (`PresenterContext` moved from `types/` to `components/`), plugin-debug
      (`DebugContext` deleted — zero consumers repo-wide), plugin-assistant (`Attention` imported
      from the root barrel instead of `/types` for a pure string helper)
- [x] Per-maker `environments` defaults for the headless-safe families (`schema`,
      `operationHandler`, `skillDefinition`) — landed; each `AppCapability.*` helper declares its
      default inline and `dx-plugin gen` reads that literal statically, so there is no second copy
      and deliberately no exported `environmentDefaults` map. 58 annotations that only restated
      their family's default are gone. See DESIGN.md §6.3

## Phase 6 — merge with main, decisions, remaining follow-ups

- [x] Merge `origin/main` into the branch (`9794ecb428`, 35 commits). Beyond mechanical conflict
      resolution it ported two real fixes out of variant files this branch deletes (`318bbad844`
      schema-registration ordering; the stale plugin-registry `environments` pin) and needed six
      fixes a passing build would not have caught. Full rationale is in the commit message
- [x] DESIGN.md §6.5 decided (Josiah, 2026-08-25): **keep the isomorphic default.** The structure
      guards are the intended safety net; inverting it would make every unannotated module a
      silent opt-out from headless builds. The accepted cost is written into §6.5 — the guards
      measure React reachability and cannot see unmet `requires` or missing config
- [x] DESIGN.md refreshed: §5.4 escape hatch marked removed (zero `overrides.*.ts` remain), §5.6
      estimates replaced with the landed counts, §6.2 inbox entry corrected, §6.4 corrected to
      record the plugin-computer exception
- [ ] **Verify the merge is green.** The merge commit was pushed with the test sweep still
      running and five suites failing (`pipeline-discord`, `plugin-calls`, `plugin-sample`,
      `plugin-transformer`, `plugin-zen`); three match the known 15s-timeout flake, two were never
      examined. Its own message says the sweep is NOT part of its verification
- [ ] Tag `plugin-computer` (or add the check below and let it force the issue). It has
      `src/capabilities/index.ts`, no `composer-plugin` tag, and an unconditioned `#capabilities`.
      Safe today only because both its modules are headless families and its barrel imports no
      React. See DESIGN.md §6.4
- [ ] Check that fails when a package has `src/capabilities/index.ts` but lacks the
      `composer-plugin` tag. Four plugins have slipped this net so far (plugin-google,
      plugin-jmap, plugin-lingo, plugin-computer), and it will keep happening. Inverts the
      default from opt-in-to-safety to opt-out-deliberately
- [ ] `plugin-client`'s `plugin.test.ts > modules activate on the expected events` needs a timeout
      above vitest's 15s default. Measured at 12.5s against a 15s budget, so it flakes under
      full-suite concurrency. Not a regression from this branch (12.1s with the change reverted)
- [ ] `@dxos/plugin-routine/util` is a convention of one. plugin-magazine's
      `magazine-curation.ts` is the only file importing `makeRoutine` from the subpath; eight
      siblings import it from the root barrel (plugin-brain, plugin-connector, plugin-crm ×3,
      plugin-inbox, plugin-projects ×2). Traced directly: the root barrel is React-free under
      both `workerd,worker` and `node`, so the subpath buys nothing today and nothing enforces
      it. Either sweep the eight onto `/util` or drop the divergence — but decide, rather than
      leaving one file different for a reason that no longer holds
- [ ] Guard-target drift: plugin-magazine, plugin-markdown, plugin-inbox and plugin-assistant
      trace `--to "@dxos/react-ui"`, while the 87 generated guards trace `--to "{react,react-dom}"`.
      A bare `import { createContext } from 'react'` — the exact leak class §6.6 catalogues for
      plugin-presenter and plugin-support — passes the narrower target. Normalize them
- [ ] Stale glob: `.moon/tasks/tag-composer-plugin.yml` still lists
      `src/capabilities/overrides.*.ts` as an input. Harmless (matches nothing) but misleading now
      that the override mechanism is deleted
- [x] Re-merge `origin/main` (`eaf9c7e3fa`, 3 commits). `plugin-claude-agents` (#12741) arrived
      with a capabilities barrel and no tag, as predicted, and got the plugin-lingo treatment:
      tag + dual-condition React guard, barrels generated (3 modules, 0 stubs), and the
      `capabilities.{node,workerd}.mjs` bundles confirmed present so the declared conditions have
      a build behind them. The one substantive conflict was plugin-magazine's
      `magazine-curation.ts`: main rewrote the template, the branch had only moved `makeRoutine`
      to `@dxos/plugin-routine/util`; resolution keeps main's rewrite with the subpath import

## Phase 7 — the first full test sweep this branch has had, and the three defects it found

The sweep at `eaf9c7e3fa` was the first one this branch ever completed: 659 tasks, 5 failed. Two
of the five diagnoses carried over from the handoff turned out to be wrong, and the real causes
were more interesting than the reported symptoms.

- [x] **plugin-excalidraw** — `plugin.test.ts` asserted `drawing-variant` active, but branch
      commit `cedd3ea6b5` annotated `DrawingVariant` with `environments: []`, so under vitest's
      `node` condition it resolves to `export const DrawingVariant = undefined` and
      `Plugin.addModule` skips it. Unsatisfiable by construction, and it reproduced in isolation
      (1.9s), so not the concurrency flake. The annotation is right and the assertion was wrong:
      inverted to `not.toContain`, which turns a broken browser claim into a real headless one —
      proof the annotation keeps the module and its React out of the node barrel.
      plugin-illustrator and plugin-tldraw never asserted variant activation at all, so
      excalidraw was the outlier. DESIGN.md §1's "test blindness" in its second form
- [x] **plugin-space** (3 tests) — `CapabilityNotFoundError` on `ephemeralState`. `SpaceState` is
      an unannotated raw `lazyModule`, so the isomorphic default carried it into the node barrel
      where main's hand-written barrel had deliberately excluded it; there it shadowed the test's
      own `EphemeralState` provider without ever activating. Annotated `environments: []`. Its
      consumers are the React surfaces, `SpacesReady` and `AppGraphBuilder` (all already
      browser-only) plus three UI-flow operations main also left unprovided headlessly. **This is
      §6.5's documented cost landing for real** — the third instance after plugin-observability
      and plugin-connector, and the guards cannot see any of them
- [x] **plugin-client** (2 tests) — reported as the 15s-budget flake. It is not. Raising the
      timeout to 60s made it hang for 60s. `activation-scheduler.ts` inferred headlessness from
      `typeof requestIdleCallback === 'function'` and, when false, ran the idle wave **inline**
      rather than forked; since `plugin-manager.ts` lets a host supply its own `whenIdle` and the
      scheduler awaits it, a headless host passing `Effect.never` hung `start()` forever instead
      of deferring a wave. Fixed with an explicit host signal rather than a browser-API sniff:
      inline only when the manager owns the default gate, whose headless branch completes
      immediately; a host-supplied gate goes back to forked, because its completion is the host's
      business. `app-framework:test` 247/247, including `start-gated modules stay off startup and
    join their plugin start wave` — the test that caught the earlier attempt at this.
      Post-fix the test runs in **1072ms**, so the timeout bump was reverted: it was never
      warranted and would have hidden the next hang for 45 extra seconds
- [x] **client-e2e** — `Timeout [200ms]` on a networked test. Passed on the next sweep;
      environmental, not a defect
- [x] **pipeline-discord** — `replay-fixture.test.ts` is deliberately non-CI: it guards on
      `existsSync(fixturePath) && !process.env.CI`. The fixture is committed, so it runs locally
      and fails on stale data; under `CI=true` it skips and the package passes 40/41, exit 0. No
      action — but it means a local `moon :test` sweep can never be fully green while that
      fixture is stale, which is worth knowing before chasing it again
