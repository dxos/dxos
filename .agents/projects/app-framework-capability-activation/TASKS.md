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

- [x] `common/capabilities.ts` arity flips (9 multi: ReactContext, ReactRoot, ReactSurface, Command, Layer, LayerSpec, TraceSink, OperationHandler, UndoMapping)
- [x] `AppCapabilities.ts` arity flips (15 multi incl. Translations, Schema, AppGraphBuilder, Settings, PluginAsset, SkillDefinition, AiModelResolver, FileUploader, AnchorSort, TextContent, CommentConfig, Navigation*)
- [x] `AppPlugin.addXModule` rewrite: shared `addCapabilityModule` factory; **policy — body-bearing helpers emit dependency mode only when the caller declares `requires`/`provides`** (body-only calls stay legacy until their Phase-7 batch; avoids runtime ProvidesMismatch for bodies contributing extra/foreign capabilities — found: settings bodies also contribute plugin-local Settings; create-object contributes SpaceCapabilities.CreateObjectEntry, so that helper has no default provides). Value-bearing helpers (translations/schema/plugin-asset/command) always dependency-mode via provide/provideAll.
- [x] process-manager: ProcessManagerPlugin → lazyModule specs + dependency mode (compatFires ProcessManagerReady); capability body → yield* tags, contributions snapshots, reactive OperationHandler atom, Scope finalizer (runtime dispose + layerStack.destroy — resolves TODO); history module → yield* + provide
- [x] app-toolkit window consumers: none in-toolkit (real consumers live in plugins → Phase 7 foundational wave)
- [x] Deprecated ordering events (core ActivationEvents + all app-toolkit Setup*/Ready; createStateEvent/createSettingsEvent kept)
- [x] Gate: app-framework (197) + app-toolkit (82) tests green; full-repo build passed

## Phase 5 — plugin-client migration (worked example)

- [x] ClientPlugin(.node/.workerd) → new API: lazyModule specs; Client provides [Client, Layer] + compatFires [ClientReady]; ClientReady listeners → requires [Client]; allOf(SpacesReady, ProgressRegistryReady) → activatesOn SpacesReady + requires [ProgressRegistry]; Schema/Migration → makeMulti; SchemaDefs/Migrations compatFires the legacy Setup* windows (bodies subscribe reactively); Plugin.addLazyModule sugar added
- [x] Capability bodies: `Capability.get` → `yield*`; `contributes` → `provide`/`provideAll`; Null-contribution deactivate → Scope finalizers
- [x] Fallout fixes: legacy fires* fields → readonly (const-inference of literals); helper legacy activate arm regained Scope.Scope in R; TS2883 type-naming imports (+ @dxos/operation, @dxos/progress deps); stray makeModule type-arg in operation-handler
- [x] **Gate integrity fix: earlier "full-repo build passed" results for Phases 2–4 were pipe-masked exit codes.** Re-ran honestly after Phase 5: EXIT=0, zero TS errors repo-wide. app-framework 197 / app-toolkit 82 / plugin-client tests green.
- [x] e2e Composer check (mixed coexistence) — **PASSED after fixes** (headless chromium against dev server; `treeView.userAccount` gate, stable across fresh contexts; A/B-verified against base commit ea1708639b by in-place file restore). Findings → fixes:
  1. Strict runtime ProvidesMismatch broke conditional providers (HubHttpClient returns [] without DX_HUB_URL) and auto-disabled plugin-client → **missing declared provides now warns; undeclared still fails** (static coverage check unchanged — conditional bodies pass via return-type union).
  2. PM LayerStack snapshot raced legacy routine LayerSpecs (baseline relied on Client riding oneOf(Startup, SetupAppGraph) so the ClientReady cascade beat the slow Startup wave) → **migrated plugin-routine LayerSpecs to dependency mode** (provides [LayerSpec, TraceSink]; specs resolve services at slice time, no requires) — multi soft-ordering now lands it before PM.
  3. Graph extensions using sync `Capability.get(Client)` inside atoms cached a defect-fallback with no reactive dep (baseline masked it via batched wave-end contributions; dependency pass contributes per-module) → **atom-read pattern** (`get(clientAtom)[0]` + empty fallback) in plugin-client root (userAccount!) + plugin-search spaceSearch. **This is a mandatory Phase-7 body pattern: graph-extension `Capability.get` → `Capability.atom` reads.**
  4. Modules reached by two activation paths double-contributed (active 519 > modules 419) → `_contributeCapabilities` is now memoized per module.

## Phase 6 — Testing utils + docs

- [x] `testing/withPluginManager.tsx`, `harness.ts`, `service.ts` — no changes needed: they route through `activate(Startup)` → `start()` and accept typed modules via the builder (fixture internals go new-style in Phase 8)
- [x] `org.dxos.app-framework.moduleActivationOrdering` idiom doc rewritten (done in Phase 2 with the PluginModule JSDoc)

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
