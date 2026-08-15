# plugin-variant-dedup — tasks

Research phase (PR #12610) — see DESIGN.md for the full report and recommendation (O2:
single canonical entry + generated stub barrels).

## Phase 0 — research (this PR)

- [x] Map current variant landscape (36 plugins, ~123 files, six sync points; drift audit → `spikes/matrix.md`)
- [x] Enumerate candidate mechanisms (O1–O5, DESIGN.md §3)
- [x] S1: bundler DCE fixture — invalidates O4 under `sideEffects: true` + source-mode consumers; negative control proves runtime `environments` opts are never tree-shakeable
- [x] S2: generator prototype + equivalence comparison (20/23 exact; 2 handwritten bugs; 1 deliberate rewrite → escape hatch)
- [x] S3: O2 end-to-end on plugin-markdown + plugin-space (build, traces + positive control, lint, check-module-structure, tests, edge-sim bundle — all green)
- [x] Draft PR with spike commits + report

## Phase 1 — decision + framework groundwork

- [ ] User sign-off on O2 (vs conservative O3) and on DESIGN.md §6 open questions
- [ ] `environments` field on `ModuleSpec`/maker options (metadata only, no behavior)
- [ ] Keep/clean the `Plugin.addModule(undefined)` skip (landed in spike commit) + unit test for the skip path

## Phase 2 — generator productization

- [ ] Promote `spikes/generate.mjs` to a real tool (`tools/` package or toolbox command), driven by `environments` annotations instead of the reverse-engineered matrix
- [ ] Emit headless barrels + stubs with `// GENERATED` headers; overrides splice (escape hatch)
- [ ] CI freshness check (regenerate + `git diff --exit-code`)
- [ ] pkg-lint rule: annotations ⇒ matching `#capabilities` conditions exist

## Phase 3 — migration (mechanical, incremental; spike commits are the template)

- [ ] Annotate + collapse the 2 spiked plugins onto the generator (replace hand-written stub barrels with generated ones)
- [ ] Sweep remaining 34 plugins; delete `plugin.node.ts`/`plugin.workerd.ts`, collapse `#plugin` conditions, prune vite entries
- [ ] Merge byte-identical `schema.node.ts`/`schema.workerd.ts` → `schema.headless.ts`; surface the 4 stale schema lists for a human call
- [ ] Fix the `OperationHandler` Startup→Idle drift in space/client/routine node barrels (regeneration does this; verify boot behavior)
- [ ] Resolve inbox lazy→inline workerd conversion (keep via override or revert)

## Phase 4 — hardening

- [ ] Extend `check-module-structure` coverage to plugins that lack it but have variants
- [ ] Fix `toolbox lintPackageExports` nested-`source` flattening hazard
- [ ] Consider a workerd-pool smoke test that activates one collapsed plugin in the real workers pool
