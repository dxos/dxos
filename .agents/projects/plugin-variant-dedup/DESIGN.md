# Plugin environment-variant dedup — research report

Status: research complete, spikes validated on `plugin-markdown` and `plugin-space` (PR #12610).
Question: can the hand-maintained browser/node/workerd plugin variants collapse into one
canonical plugin definition with per-module environment flags, without losing the static
bundle-hygiene guarantees?

**Answer: yes — recommended mechanism is a single canonical plugin entry plus generated
per-environment capability barrels with `undefined` stubs (Option O2 below), with the
generator driven by `environments` annotations on the canonical barrel.** Validated
end-to-end; the main alternatives were spiked and are invalidated (O4) or rejected with
evidence (O1, O5). O3 is the conservative fallback using the same annotations.

## 1. Problem, quantified

36 of 98 plugins carry environment variants: ~123 variant-only files, ~2,370 lines, and six
hand-synced touchpoints per plugin — `plugin.ts`/`plugin.node.ts`/`plugin.workerd.ts`,
`capabilities/{index,node,workerd}.ts`, sometimes `schema.{node,workerd}.ts`, the
`package.json` `imports` condition maps, the `vite.config.ts` entry list, and the
`check-module-structure` moon task.

Demonstrated drift on main (audit: `spikes/matrix.md`, 23 mismatch flags across 35 plugins):

- **Stale headless schema lists** — `schema.node.ts`/`schema.workerd.ts` are hand-copies of
  `capabilities/schema.ts` and have diverged in 4 plugins: plugin-space (missing `TaskSet`),
  plugin-inbox (4 of 9 types), plugin-routine and plugin-magazine (missing `Instructions`).
  In every case the node and workerd copies are byte-identical to each other — the split
  buys nothing and doubles the drift surface.
- **Node entries silently resolving the browser barrel** — 7 plugins' `plugin.node.ts`
  imports `#capabilities` but their `package.json` has no `node` condition for it
  (assistant, pipeline, debug, devtools, presenter, game, illustrator; game and illustrator
  do it under workerd too).
- **Semantic drift between barrels** — a real bug class: plugin-space, plugin-client and
  plugin-routine's `capabilities/node.ts` re-declare `OperationHandler` with raw
  `Capability.lazyModule` instead of the `AppCapability.operationHandler` maker; the maker
  bakes in `activatesOn: Startup`, the raw call defaults to Idle — so the node entrypoint
  registers boot-path operation handlers a wave late. Also: assistant's module id
  `'skill-definition'` (workerd) vs `'SkillDefinition'` (index); inbox's workerd barrel
  converts `OperationHandler` lazy→inline.
- **Pure boilerplate** — plugin-thread's node/workerd files byte-identical; map-solid and
  wnfs ship empty no-op variant plugins; plugin-file maps `workerd` → `plugin.node.ts`.
- **Fan-out cost** — commit `7db68acf` (move Schema capability) touched 210 files and missed
  exactly the 4 plugins whose schema lives in `schema.node.ts` → the stale lists above.
- **Test blindness** — `plugin.test.ts` imports `#plugin`, which resolves the _node_ variant
  under vitest; the browser module list of 33 plugins was never asserted.

## 2. Constraints any mechanism must satisfy

1. **"Lazy defers evaluation, not bundling."** Downstream bundlers (edge operation-service:
   esbuild with `conditions: ['workerd','worker','browser']`; the `dx` CLI: bun under
   `node`) follow the dynamic import behind every lazy capability. Filtering must therefore
   be visible to _static resolution_ — different files per condition — not runtime flags.
   The enforcement gate (`check-module-structure` → `dx-trace-imports` over built dist) and
   the env-tests bundle assertion both check static reachability.
2. **Built plugin entries externalize all non-relative imports** (vite lib mode / rolldown),
   so `#capabilities` resolution happens in the _consumer's_ bundler via `package.json`
   `imports` conditions. This is the load-bearing fact behind O2: one built `plugin.mjs`
   can serve every environment because the per-env difference rides the barrel condition.
3. **Source-mode consumers bypass the build**: vitest (all pools) and `DX_SOURCE=1` bun
   prepend the `source` condition and walk raw TS. Any mechanism relying on a build-time
   transform (defines, DCE) leaves source-mode consumers unfiltered — a hard problem for
   O4, a non-issue for condition-based file selection.
4. TypeScript always typechecks against the `types` condition (the browser barrel). Headless
   barrels are never typechecked against their variant today; a mechanism should not make
   this worse (O2 keeps it neutral; the generator makes the barrels correct by construction).

## 3. Options considered

### O1 — runtime-only filtering (env tag on module, manager skips)

Rejected on constraint 1, with experimental confirmation: the DCE spike's negative control
showed `Plugin.addModule(X, { environments: [...] })` is _never_ tree-shakeable — the module
reference is a used value, and all three environment builds come out byte-identical. Runtime
tags are still useful metadata, but they cannot provide bundle hygiene.

### O2 — single canonical entry + generated stub barrels ("recommended")

One `plugin.ts` lists every module once. Per-env `#capabilities` barrels become _generated_
artifacts: for each environment, the generator AST-slices the canonical
`capabilities/index.ts`, keeping the exact maker-call statements of included modules (with
only the imports they reference) and emitting `export const X = undefined;` stubs for
excluded ones. `Plugin.addModule(undefined)` is a no-op (framework change, ~10 lines).
`#plugin` loses all conditions; `plugin.node.ts`/`plugin.workerd.ts`/vite variant entries
are deleted.

### O3 — full codegen of today's structure (conservative fallback)

Same `environments` annotations, but the generator emits today's exact artifacts (three
plugin entries, subset barrels, conditions, vite entries) as checked-in generated files.
Zero framework/runtime/dist-shape change; keeps all files but machine-owned. Strictly more
moving parts than O2 for the same authored source; only preferable if collapsing the
`#plugin` conditions worries out-of-repo consumers (the spike evidence says it should not —
see §4.1).

### O4 — per-variant builds from one source via define + tree-shaking (invalidated)

Fixture spike (rolldown-vite 8, the repo's own external predicate, both `sideEffects`
settings): statement-level `if (__DX_BROWSER__)` guards _do_ reliably drop the module
reference — but under the repo's actual `"sideEffects": true`, the browser-only dynamic
import chunk (containing `import 'react'`) is still emitted into the headless dist as an
orphan file; fixing that requires `/* @__PURE__ */` on every maker call or flipping
`sideEffects`. Worse, constraint 3 is structural: vitest/bun source mode never runs the
defines, so the workerd vitest pool and the CLI would see unfiltered code. Three builds per
plugin instead of one, plus annotation discipline, for a result the condition mechanism
gives for free. Not recommended.

### O5 — consumer-side composition via per-module subpath exports

Rejected without spike: moves the composition duplication into every host, requires
coordinated changes in the out-of-repo edge repo, and inverts ownership (the plugin should
own which of its modules run where).

## 4. Spike evidence

### 4.1 S3 — O2 end-to-end on real plugins (committed on this branch)

Applied to **plugin-markdown** (12 modules) and **plugin-space** (17 modules — the messiest
case: per-env schema lists, `PLUGIN.mdl?raw` asset, inline translations, star-exported
`AppGraphBuilder`, options-mapped `UndoMappings`). Inline env-varying `addModule` calls
(translations, pluginAsset) moved into the canonical barrel as `Translations`/`PluginAsset`
module exports — after which both plugins' entries are env-neutral single files.

All checks green on both plugins:

| Check                                                                                                                  | Result                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `moon run <p>:build`                                                                                                   | ✓ single `plugin.mjs`, barrel imports externalized                                                                                      |
| `check-module-structure` (dx-trace-imports, workerd,worker)                                                            | ✓ no react/react-dom/@dxos/react-ui reachable                                                                                           |
| same trace under `node` conditions                                                                                     | ✓ clean                                                                                                                                 |
| positive control (browser conditions, `--fail-on missing`)                                                             | ✓ react-ui _is_ reached — the gate is sensitive, not vacuous                                                                            |
| `moon run <p>:lint`                                                                                                    | ✓ (after switching two relative `./plugin` imports to `#plugin` — the lint rule can finally see the alias now that it is unconditional) |
| `plugin.test.ts` under vitest (node condition → stub barrel path)                                                      | ✓ modules activate, stubs skipped                                                                                                       |
| edge-simulation bundle (esbuild, `['workerd','worker','browser']`, `node:*` external — the real edge bundler's config) | ✓ 465 inputs, 31 from plugin-markdown, 0 react                                                                                          |

Note: `@codemirror/state`/`view` do reach the workerd bundle — through
`OperationHandler → operations → @dxos/ui-editor/headless`, on main as well; pre-existing
and orthogonal (the repo's policy forbids react/react-dom/@dxos/react-ui only).

### 4.2 S2 — generator prototype + drift audit (`spikes/`)

A ~930-line TypeScript-compiler-API prototype (`audit.mjs`, `generate.mjs`, `compare.mjs`,
`lib/`) that (a) reverse-engineered the implied environment matrix of all 36 plugins from
their variant files, and (b) generated headless barrels for markdown/space/thread/inbox
from the canonical barrel + matrix. Comparison against the handwritten barrels: **20/23
modules semantically identical**; the 3 divergences are 2 handwritten drift bugs (the
`OperationHandler` Startup→Idle regression, §1) and 1 deliberate rewrite (inbox workerd's
lazy→inline conversion) that needs an annotation escape hatch. Handled robustly: attached
comments, namespace-import trimming, `export * from` indirection, import aliases. So
annotation-driven generation captures reality, and regeneration _fixes_ the known drift by
construction.

### 4.3 S1 — bundler DCE fixture (verdict feeding O4)

See §3/O4. Extra findings worth keeping: rolldown folds both statement-level `if`s and
ternaries over defines reliably; unused _external_ import specifiers are dropped from import
statements regardless of `sideEffects` (which is why O2's canonical entry stays clean); and
`sideEffects: true` blocks orphan-chunk pruning unless makers are `@__PURE__`-annotated.

## 5. Recommended design (O2, concrete)

1. **Framework** (done in spike): `Plugin.addModule(undefined)` → no-op.
2. **Annotation**: `environments?: readonly string[]` on `ModuleSpec` / maker options in the
   canonical `capabilities/index.ts` — the single source of truth. It names the package.json
   **conditions** a module is additionally split out for (`'node'`, `'workerd'` in this repo).

   Revised (Josiah, 2026-08-15) from the original `('browser' | 'node' | 'workerd')[]` with a
   `['browser']` default. There is no `browser` condition — the canonical barrel IS the
   `default` condition, which is what a browser resolves — so `'browser'` was an inert token the
   generator filtered straight back out, i.e. a third of every annotation in the repo was
   ceremony. **Omitting `environments` means "do not split this module by condition"**, not
   "browser-only"; no variant is generated for it at all. The type is an open string because
   conditions are defined by whichever build tool resolves the package, so the framework has no
   business enumerating them (`deno`, `electron`, or a private condition are equally valid).

   Corollary: a plugin whose modules name no conditions generates nothing and keeps an
   unconditioned `#capabilities`. If a headless host loaded it, it would resolve the default
   barrel — so headless hosts simply leave browser-only plugins out of their plugin list, rather
   than the plugin carrying a stub barrel to be safely ignorable.

3. **Generator**: productize `spikes/generate.mjs` and **ship it with
   `@dxos/app-framework` as a distributed binary** (e.g. `bin: dx-plugin gen`), not
   monorepo-internal tooling — if stub-barrel generation is the plugin authoring pattern,
   out-of-repo plugin authors need it from the published package. Precedent in the same
   package: the composer vite plugin is compiled to `dist/plugin` by the `compile-plugin`
   task and exported at `./vite-plugin`; the generator follows that shape plus a `bin`
   entry (decision: Josiah, 2026-08-15). It emits the headless barrels into a
   **`gen/` folder** — `src/capabilities/gen/{node,workerd}.ts` (subset + stubs +
   `// GENERATED` header), with the `#capabilities` source conditions pointing there —
   so one repo-wide `gen/` gitignore pattern covers every plugin (decision: Josiah,
   2026-08-15; same layout as `echo-query`'s `src/parser/gen/`). Runs as the plugin's
   `prebuild` moon task with declared `outputs`, and the generated barrels are
   **gitignored, not committed** (decision: Josiah, 2026-08-15 — supersedes the earlier
   committed-files + CI-freshness-check sketch). `build` depends on `prebuild`, and
   `test` depends on **`^:prebuild`** so every dependency package's generated sources
   exist too — set as the default in the shared test tags
   (`.moon/tasks/tag-ts-test*.yml`, which today carry `^:build`; the source-reading
   direction replaces that with the prebuild closure) rather than per-plugin moon.yml.
   Same shape as `echo-query`'s `prebuild-lezer` (`src/parser/gen/*` via task
   `outputs`), aligned with apps reading from source rather than depending on full
   builds. The task graph is the freshness guarantee, so no separate CI check is needed
   and generated diffs never appear in review.
   The shipped tooling also owns **setting up the package.json `imports`/`exports`
   maps** (decision: Josiah, 2026-08-15) — deriving the `#plugin`/`#capabilities`
   condition wiring and subpath exports from the same annotations, instead of the
   internal toolbox/codemorph tooling (which out-of-repo authors don't have, and whose
   `lintPackageExports` would flatten nested `source` maps if pointed at a plugin).
   Barrels and condition maps come from one source of truth, so the
   "missing `node` condition silently resolves the browser barrel" class (7 plugins
   today) becomes unrepresentable rather than merely linted.
   Follow-ups this creates: (a) non-moon entrypoints (bare `vitest`/IDE runners,
   `DX_SOURCE=1` bun) need the barrels present — run `moon run :prebuild` once on a fresh
   clone, or have the wrapper scripts trigger it; (b) `pkg-lint`'s `import-source-missing`
   check must run after prebuild or exempt declared prebuild outputs; (c) `pack` must
   include the generated barrels in the tarball (pack → build → prebuild should give this
   for free — verify). If a plugin ever needs a node-only module, generate the browser
   barrel too (canonical index stays authored, all consumed barrels generated); no current
   plugin needs it for browser, but plugin-connector/plugin-registry's node-only `Commands`
   land here.
4. ~~**Escape hatch**: a per-env override file (e.g. `capabilities/workerd.overrides.ts`)
   whose exports the generator splices in place of the sliced statement.~~ **Removed.** The
   mechanism shipped, then proved unnecessary: once per-family defaults landed (§6.3), every
   remaining override restated what an `environments` annotation already said. All override
   files and the generator's splice path are deleted; the repo now has zero `overrides.*.ts`.
   A per-environment difference is expressed as an `environments` annotation at the module, or
   not at all. There is deliberately no way to give one module a different _body_ per
   environment: that is custom per-environment composition, which is out of scope by decision.
5. **Schema**: collapse `schema.node.ts`/`schema.workerd.ts` (byte-identical everywhere)
   into one `schema.headless.ts` referenced by both generated barrels; longer term, per-type
   env annotations in the canonical schema list, generated the same way.
6. **Deletions per plugin**: `plugin.node.ts`, `plugin.workerd.ts`, the `#plugin`
   conditions, two vite entries, one schema copy. Estimated repo-wide at ~70 files
   immediately and ~100 after consolidation. **Actual, as landed**: zero
   `plugin.{node,workerd}.ts`, zero `schema.{node,workerd}.ts`, and zero `overrides.*.ts`
   remain anywhere under `packages/plugins`, across the 97 plugins carrying a capabilities
   barrel.
7. **Guard-rail updates**: `check-module-structure` needed more than the spike suggested.
   `dx-trace-imports --conditions` is now **repeatable**, each occurrence an independent set:
   `#capabilities` resolves to a different barrel per runtime, so the previous single set only
   ever checked one of them. Every plugin guard traced `workerd,worker` and nothing traced
   `node`, so node-side React leaks passed a green check — the corrected guards found three
   (plugin-assistant, plugin-debug, plugin-presenter), all pre-existing on main.

   Each plugin's guard traces exactly the conditions it produces. Those counts were written
   during the narrow phase and are superseded by the widened defaults; see §6.4 for the current
   census. As landed, 87 plugins carry the dual `workerd,worker` + `node` React guard, and
   plugin-map-solid is the one plugin that deliberately carries no guard at all — it declares no
   conditions, so tracing it would assert a property of a bundle no headless host loads. (An
   earlier draft of this section paired map-solid with plugin-wnfs; wnfs does carry a guard.)
   Also fix `toolbox lintPackageExports` which would flatten nested `source` maps if ever
   pointed at plugins (pre-existing hazard).

Migration is mechanical per plugin (the two spike commits are the template) and incremental
— collapsed and uncollapsed plugins coexist; consumers see no API change.

## 6. Open questions

1. ~~Stale headless schema lists~~ — resolved during migration; no `schema.node.ts` /
   `schema.workerd.ts` files remain.
2. ~~inbox's lazy→inline workerd conversion~~ — resolved; inbox annotates its canonical barrel
   directly (two `environments: ['node']` modules) and needs no override file. The
   `overrides.<env>.ts` mechanism it originally used is gone repo-wide; see §5.4.
3. ~~Per-maker `environments` defaults~~ — **done** (Josiah, 2026-08-15), and it subsumed the
   global-default question. Each `AppCapability.*` helper declares its own default inline — the
   `environments` literal it passes to `moduleMaker`, or the `options?.environments ?? [...]`
   fallback in the value-based helpers — and `dx-plugin gen` reads that same literal statically,
   so there is no second copy to drift. There is deliberately no exported `environmentDefaults`
   map: a shared table is a second place to state the fact. 58 annotations that only restated
   their family's default are gone, and a genuine exception stays a one-line `environments` at
   the exception (plugin-transcription's `appGraphBuilder` renders a `<Mic/>` inline, so it
   declares `[]`).

   Resolution walks the barrel's namespace imports to the declaring module via that package's
   `exports`, preferring `source` and falling back to `import` — so it works in-workspace and
   against a published package, which is what makes it usable by out-of-repo plugin authors.

   Defaults, from the annotation evidence: headless-by-construction families (`schema`,
   `operationHandler`, `appGraphBuilder`, `settings`, `translations`, `skillDefinition`,
   `undoMappings`, `commentConfig`, `textContent`, `navigationResolver`, `commands`, `layerSpec`)
   → `['node','workerd']`; UI-bound families (`surface`, `reactRoot`, `reactContext`,
   `pluginAsset`, `navigationHandler`, `anchorSort`) → `[]`. `commands` and `layerSpec` are NOT
   node-only: both are routinely wanted in the browser (the devtools terminal; any browser-side
   service graph), and a genuinely platform-dependent instance overrides at its call site.

4. **Tag membership was an artifact, now fixed.** The `composer-plugin` tag had gone to exactly
   the 36 plugins that already carried hand-written variants — a record of what someone had
   written, not of what any host needs. It was already wrong: the `dx` CLI depends on
   plugin-google and plugin-jmap, both untagged, so their `#capabilities` stayed unconditioned
   and the CLI resolved the full browser barrel.

   Four different sets are involved and it is worth keeping them apart, because "tagged" and
   "guarded" are not the same population. Measured at `eaf9c7e3fa`: **97** plugins carry a
   capabilities barrel, **96** carry the `composer-plugin` tag, **88** define a
   `check-module-structure` task, and **85** declare a `capabilities.workerd` condition. Of
   those 88 tasks, 87 are the dual-condition React guard; plugin-computer's is a different
   assertion entirely (its browser entry must not reach `node:child_process`). The
   invariant that actually holds is the narrow one: every plugin whose `#capabilities` declares
   a headless condition carries a guard. The 8 tagged-but-unguarded plugins (heygen, ideogram,
   iroh-beacon, mermaid, osrm, progress, status-bar, typefully) declare no conditions, so there
   is no headless bundle to trace. The cost of tagging is low: a
   plugin whose modules are all UI families stubs every module out, so its barrel is empty and
   its guard passes with nothing included. A plugin that produces no conditions at all carries no
   guard — tracing it would assert a property of a bundle no headless host loads.

   **One exception, found 2026-08-25 and still open: plugin-computer.** It has
   `src/capabilities/index.ts` but no `composer-plugin` tag, so `dx-plugin gen` never runs for it
   and its `#capabilities` map carries only `source`/`types`/`default` — no `node`, no `workerd`.
   It is harmless today by accident rather than by design: both its modules (`SkillDefinition`,
   `OperationHandler`) are headless families and its canonical barrel imports no React, so the
   unconditioned fall-through to the browser barrel resolves something safe. It stops being
   harmless the moment anyone adds a `surface` or `reactRoot` module to that barrel, at which
   point a headless host silently resolves React and nothing in the build says so. It does carry a
   hand-written `check-module-structure`, but that guard asserts a different property (the browser
   entry cannot reach `node:child_process`), not headless React reachability.

   This is the case for inverting the default: tag membership is opt-in-to-safety, so a new plugin
   is unprotected until someone remembers. plugin-google, plugin-jmap and plugin-lingo each slipped
   the net this way before plugin-computer did. The follow-up is a check that fails when a package
   has `src/capabilities/index.ts` and lacks the tag, making the safe state automatic and the
   exception deliberate.

5. **The isomorphic default has a second axis the guards cannot see — DECIDED: keep it**
   (Josiah, 2026-08-25). A module with no
   annotation and no family default is carried into every variant, on the theory that the structure
   guards will catch anything that turns out not to be isomorphic. That holds for React
   reachability, which is all `dx-trace-imports` measures. It does not hold for two other ways a
   module can be wrong in an environment:

   - **Unsatisfiable `requires`.** plugin-markdown's `AnchorResolver`/`AnchorSort` require the app
     graph and `MarkdownState` requires attention's view state — app-shell capabilities no headless
     host registers. Under node they failed the dependency graph at boot.
   - **Missing configuration.** plugin-calls' `CallManager` reads `runtime.services.edge.url` in its
     constructor; absent that, the module throws and the plugin auto-disables.

   Both surface only when a host actually boots the plugin set, which in CI means the `dx` CLI's
   e2e tests — 22 of ~95 plugins. plugin-observability and plugin-connector were caught the same
   way, and in both cases the headless module set on main had been deliberately narrow (observability
   shipped only the `OperationHandler` stub) — the isomorphic default silently overrode a documented
   decision.

   A third piece of evidence arrived during the merge with main. **Three** modules turned out to
   be genuinely browser-only and were caught by the React guard alone, never by a type error:
   plugin-illustrator's `SvgVariant`, plugin-excalidraw's and plugin-tldraw's `DrawingVariant`.
   All three carry `environments: []` and are variant/provider modules handing React components
   to plugin-illustrator, a shape the guard catches precisely because React is what it measures.

   A fourth module, plugin-projects' `Templates`, was previously recorded here as a browser-only
   case. That was wrong and is corrected: it carries `environments: ['workerd']`, so it is
   excluded from _node_ and shipped in the workerd barrel — not browser-only, and the opposite
   axis from the other three. It hands out no React (nothing under `src/templates/` references
   react or tsx); the exclusion is a node-condition reachability matter through its import chain,
   which is a different and still-unnamed fact. Worth pinning down, because a module excluded
   from one headless runtime but not the other is the case this design reasons about least.

   **The alternative that was rejected.** Keep the per-family defaults but let an unannotated raw
   `Capability.lazyModule` generate no variant, as it did before. One predicate in `generate.ts`
   (`member.environments === null` excluded rather than carried) plus regeneration. That would
   remove this class outright instead of relying on boot errors in whichever hosts happen to have
   end-to-end coverage.

   **Decision: keep the isomorphic default.** The structure guards are the intended safety net,
   and inverting the default would make every unannotated module a silent opt-out from headless
   builds, which is the failure mode this project set out to remove. The cost is accepted and
   stated here rather than designed away: an unannotated module that is browser-only for a reason
   the guard cannot see (unmet `requires`, missing config) will fail at boot in a headless host,
   not at build time. `dx-trace-imports` measures React reachability and nothing else.

   What this obliges going forward: a module whose headless behaviour depends on capabilities or
   configuration no headless host provides must carry an explicit `environments: []`, and the
   reviewer's question on any new raw `lazyModule` is "does this boot with no app shell and no
   config?". The `dx` CLI's e2e tests are the only automated check that answers it, and they
   cover 22 of ~95 plugins.

6. **What the widened defaults caught.** Eleven real leaks, every one pre-existing on main and
   invisible until the guards traced both condition sets:

   - React values parked in `types/` — plugin-presenter's `PresenterContext`, plugin-debug's
     `DebugContext` (dead, deleted), plugin-support's `Tour.Context`. `types/` is reachable from
     the node barrel, so a live `createContext` there pulls React into a headless bundle.
   - Root-barrel imports for React-free values — `@dxos/react-ui-board`,
     `@dxos/react-ui-canvas{,-editor}` gained `./types` entries (matching
     `@dxos/react-ui-attention/types`) for schema that never needed React; `@dxos/shell` gained
     `./translations` for the same reason.
   - Surface ids living in component modules — plugin-registry's `LOAD_PLUGIN_DIALOG` moved to
     its React-free `types.ts`; the app-graph builder needed only the id, not the dialog.
   - plugin-commerce and plugin-onboarding imported `./capabilities` relatively rather than
     `#capabilities`, bypassing the condition map entirely so every runtime got the browser
     barrel.

7. **The condition map had no build behind it — fixed.** `dx-plugin gen` wrote
   `#capabilities` into `package.json` naming `./dist/lib/capabilities.{node,workerd}.mjs`, but
   the build entries live in each package's hand-written `vite.config.ts`. 58 of the 85
   conditioned plugins therefore declared conditions the build never produced. Two consequences,
   the second worse than the first:

   - A published package resolves `ERR_MODULE_NOT_FOUND` under node or workerd. In-repo work
     never saw it, because the `source` condition points at the `gen/*.ts` files, which exist.
   - `dx-trace-imports` could not resolve `#capabilities`, recorded it as `[external]`, stopped
     the crawl at that edge, and reported "No import paths to react" — **a passing guard that had
     never entered the barrel it was written to check.** Only 27 of the 85 plugins were really
     being traced.

   Both halves are now closed. `vite.base.config.ts` derives the `capabilities.<env>` entries
   from the package's own `#capabilities` condition map, so the manifest the generator writes and
   the bundles the build emits cannot disagree, and a declared condition whose generated source is
   missing is a hard error rather than a silent omission. The 34 hand-listed entries are deleted.
   `dx-trace-imports` now fails when a `#` subpath cannot be resolved under the conditions being
   tested: a package's own subpath import always has a target, so a failure means the trace proves
   nothing.

   The general lesson for this design: a generated manifest needs the build wired to the same
   source of truth, and a structure guard needs to fail when it cannot reach what it is checking.
   Silence read as success in both places.

8. **The generator was not in the task graph — fixed.** `.moon/tasks/tag-composer-plugin.yml` had
   `build`/`test` depend on `~:#prebuild`, which resolves to nothing for a task tagged in the same
   inherited file (`moon task <plugin>:build` listed 22 deps, none of them the generator). The
   dependents' form, `^:#prebuild`, does resolve, which is what hid it. Both now name
   `~:gen-modules` directly. The task's `inputs` also omitted the modules that declare
   the per-family defaults, so a default change left every plugin's barrel stale in cache;
   `AppCapability.ts` and `SpaceCapability.ts` are now inputs.

## Artifacts

- Spike commits on this branch: framework change + plugin-markdown, then plugin-space.
- `spikes/` — the pre-implementation prototype (`audit.mjs`, `generate.mjs`, `compare.mjs`,
  `lib/`, `matrix.md`, `generated/`, `edge-sim.mjs`) that produced the findings in §4.
  **Removed** once the real `dx-plugin gen` tool superseded it and the full 36-plugin sweep
  verified clean (repo-wide build/test/`check-module-structure` green, zero plugins left on
  the old variant pattern) — the findings live on in this doc and in the production code the
  prototype's evidence justified.
- PR: #12610 (draft). DCE fixture lives in the session scratchpad only; its verdict is §4.3.
