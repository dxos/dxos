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
- [ ] Per-maker `environments` defaults for the headless-safe families (`schema`,
      `operationHandler`, `skillDefinition`) — `moduleMaker` plumbing is in, no maker declares
      one yet. See DESIGN.md §6.3 for the annotation audit and blast radius
