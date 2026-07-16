# Tasks — app-framework capability-dependency activation

Spec + decisions: [DESIGN.md](./DESIGN.md). One PR; does not land until all plugins are migrated
and the legacy API is deleted (Phase 8).

## Phase 1 — Capability tags + arity + contributions + errors

- [x] `capability.ts`: `Tag<T>`/`MultiTag<T>` (yieldable, arity-branded, assignable to `InterfaceDef<T>`); `make` returns `Tag<T>`; add `makeMulti`
- [x] `capability.ts`: `Contribution`/`provide`/`provideAll`, `ProvidesReturn`/`EnsureProvides`/`Requirements`, `Contributions<T>` type; `Capability.contributions` accessor
- [x] `errors.ts` (new): CapabilityNotFoundError, ModuleActivationError, DependencyCycleError, MissingProviderError, DuplicateProviderError, ProvidesMismatchError; retrofit `Capability.get` (typed E) + manager `get`/`_capability` throw tagged; `waitFor` E narrowed to never; plugin-manager regex sniff → instanceof check
- [x] `capability-manager.ts`: `contributions()` live view over the atom family (stable per identifier)
- [x] Tests: new `capability.test.ts` (8 tests: yieldability, arity crossing `@ts-expect-error`, EnsureProvides/Requirements type-level); extended `capability-manager.test.ts` (contributions view + tagged error asserts). Full app-framework suite green (15 files).
- [x] Gate: full-repo build (`moon exec --on-failure continue --quiet :build`) — passed 2026-07-16

## Phase 2 — Module union + builder + typed makeModule/lazy

- [x] `plugin.ts`: `ActivationSpec` ('dependency' | 'event' | 'legacy'); `PluginModule.activation` + deprecated getters; `TypedModuleOptions` + `ValidateModuleOptions` (validation on addModule's RETURN type — param-intersection validators break Opts inference with inline fnUntraced generators); builder stores erased `ModuleEntry`; `normalizeActivation` in resolveModule with invariants
- [x] `capability.ts`: `makeModule` widened (contributions + Requirements R); new `lazyModule(name, spec, loader)` (spec eager, typed body; legacy `lazy` deprecated); `expandContributions` bridges Contribution → legacy entries in `_loadModule`
- [x] plugin-manager: mode guards on event queries (`_get*ModulesByEvent`, `_getModulesForActivation`, `_setPendingResetByModule`); `_getAfterEvents` fires `compatFires` for typed modules
- [x] Tests: new `plugin.test.ts` (11 tests: normalization, typed activate end-to-end, legacy compile, `@ts-expect-error` mode/coverage/requires enforcement, lazyModule)
- [x] Gate: app-framework build + test (178 passed); full-repo build — passed 2026-07-16

## Phase 3 — Manager: dependency pass + coexistence

- [x] `start()` (dependency pass ∥ legacy Startup wave via `_activateEvent(suppressEventMessage)`; event-level Startup message published last — useApp ready contract); `activate(Startup)` delegates to `start()`; `Startup` event moved to core `activation-event.ts` (common re-exports)
- [x] `_activateDependencyGraph` (singleton provider index + DuplicateProviderError; hard edges + Kahn waves + DependencyCycleError w/ path; multi soft edges dropped wholesale on cycle; MissingProviderError w/ event-gated hint; legacy → waitFor bridge; per-module failure isolation skips transitive dependents only)
- [x] `_resolveRequires` (Context.unsafeMake; singleton getAll→waitFor bounded by activationTimeout→CapabilityNotFoundError; multi→contributions view) wired into `_loadModule`; runtime ProvidesMismatchError validation on raw items (empty provideAll counts)
- [x] `_pullDependencyProviders` (event-mode on-demand transitive provider pull in `_activateEvent`); compatFires fired after dependency-module activation and via `_getAfterEvents` for event-mode waves
- [x] `deactivate` dependents-first (`_collectCapabilityDependents`, reverse activation order) + `_pendingReactivate`; `_enableOne` incremental pass when `_started` (failures scoped to plugin); shutdown resets `_started`/`_pendingReactivate`
- [x] Regex sniff replaced in Phase 1
- [x] Tests: `describe('capability dependency activation')` — 19 tests, all green; legacy suite untouched-green (197 total)
- [x] Gate: app-framework build + test

## Phase 4 — Core migrations (app-framework common, process-manager, app-toolkit)

- [ ] `common/capabilities.ts` arity flips (multi: ReactContext, ReactRoot, ReactSurface, Command, Layer, LayerSpec, TraceSink, OperationHandler, UndoMapping)
- [ ] `AppCapabilities.ts` arity flips (multi: Translations, Schema, AppGraphBuilder, Settings, PluginAsset, SkillDefinition, Toolkit, TextContent, CommentConfig, Navigation*, AnchorSort)
- [ ] `AppPlugin.addXModule` helpers emit dependency-mode modules (legacy opt-out kept)
- [ ] process-manager-capability → dependency mode (+ SetupProcessManager window shim, Scope-finalizer TODO)
- [ ] app-toolkit Setup*-window consumers (translator, app-graph, settings, progress registry) → requires/Contributions
- [ ] Deprecate ordering events (still exported + fired for legacy)
- [ ] Gate: full-repo build; app-framework + app-toolkit tests

## Phase 5 — plugin-client migration (worked example)

- [ ] ClientPlugin module list → new API (Client provides [Client, Layer] + compatFires [ClientReady]; ClientReady listeners → requires; allOf → activatesOn + requires; Schema/Migration multi)
- [ ] Capability bodies: `Capability.get` → `yield*`; `contributes` → `provide`
- [ ] Gate: plugin-client build + test; e2e Composer check (mixed coexistence)

## Phase 6 — Testing utils + docs

- [ ] `testing/withPluginManager.tsx`, `harness.ts`, `service.ts` accept new-style modules
- [ ] Rewrite `org.dxos.app-framework.moduleActivationOrdering` idiom doc (plugin.ts)

## Phase 7 — Migrate all remaining plugins (~180)

Foundational wave first (plugin-space, plugin-graph, plugin-settings, plugin-deck/layout,
plugin-attention), then leaf batches (parallel Sonnet subagents, worktree-isolated).
Per-plugin pattern + custom-event audit: DESIGN.md Phase 7. Gate per batch: `moon run <pkg>:build`
+ `:test`; full build after each wave.

- [ ] Call-site inventory + batch assignment (Explore agent)
- [ ] Foundational wave
- [ ] Leaf batches (track per-batch below as assigned)
- [ ] app-framework/app-toolkit stragglers, stories, ui-editor

## Phase 8 — Delete legacy API + scaffolding

- [ ] Remove legacy addModule shape, fires{Before,After}Activation, ordering-only events, compatFires, legacy Startup wave + waitFor bridge, 'legacy' spec arm, window shims
- [ ] Rewrite/delete legacy-only tests
- [ ] Gate: full build + full test suite + lint/format; e2e Composer check (pure new-world)

## Landing

- [ ] Changesets (@dxos/app-framework, @dxos/app-toolkit, touched plugins)
- [ ] Full suite: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`; `moon run :lint -- --fix`; `pnpm format`
- [ ] submit-pr skill
