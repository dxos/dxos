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
- [x] `AppCapabilities.ts` arity flips (15 multi incl. Translations, Schema, AppGraphBuilder, Settings, PluginAsset, SkillDefinition, AiModelResolver, FileUploader, AnchorSort, TextContent, CommentConfig, Navigation\*)
- [x] `AppPlugin.addXModule` rewrite: shared `addCapabilityModule` factory; **policy — body-bearing helpers emit dependency mode only when the caller declares `requires`/`provides`** (body-only calls stay legacy until their Phase-7 batch; avoids runtime ProvidesMismatch for bodies contributing extra/foreign capabilities — found: settings bodies also contribute plugin-local Settings; create-object contributes SpaceCapabilities.CreateObjectEntry, so that helper has no default provides). Value-bearing helpers (translations/schema/plugin-asset/command) always dependency-mode via provide/provideAll.
- [x] process-manager: ProcessManagerPlugin → lazyModule specs + dependency mode (compatFires ProcessManagerReady); capability body → yield* tags, contributions snapshots, reactive OperationHandler atom, Scope finalizer (runtime dispose + layerStack.destroy — resolves TODO); history module → yield* + provide
- [x] app-toolkit window consumers: none in-toolkit (real consumers live in plugins → Phase 7 foundational wave)
- [x] Deprecated ordering events (core ActivationEvents + all app-toolkit Setup\*/Ready; createStateEvent/createSettingsEvent kept)
- [x] Gate: app-framework (197) + app-toolkit (82) tests green; full-repo build passed

## Phase 5 — plugin-client migration (worked example)

- [x] ClientPlugin(.node/.workerd) → new API: lazyModule specs; Client provides [Client, Layer] + compatFires [ClientReady]; ClientReady listeners → requires [Client]; allOf(SpacesReady, ProgressRegistryReady) → activatesOn SpacesReady + requires [ProgressRegistry]; Schema/Migration → makeMulti; SchemaDefs/Migrations compatFires the legacy Setup\* windows (bodies subscribe reactively); Plugin.addLazyModule sugar added
- [x] Capability bodies: `Capability.get` → `yield*`; `contributes` → `provide`/`provideAll`; Null-contribution deactivate → Scope finalizers
- [x] Fallout fixes: legacy fires\* fields → readonly (const-inference of literals); helper legacy activate arm regained Scope.Scope in R; TS2883 type-naming imports (+ @dxos/operation, @dxos/progress deps); stray makeModule type-arg in operation-handler
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

- `:test`; full build after each wave.

Docs: [PHASE7-WORKLIST.md](./PHASE7-WORKLIST.md) (inventory + batches + event classification),
[MIGRATION-BRIEF.md](./MIGRATION-BRIEF.md) (per-plugin recipe given to every batch agent).
Gate recipe per wave: per-package build+test → framework suites → Composer boot check
(warm run, fresh context, `treeView.userAccount`, zero failed plugins).

- [x] Call-site inventory + batch assignment → PHASE7-WORKLIST.md (~89 packages; 5 runtime events stay; 8 graph-extension atom-pattern files flagged)
- [x] Foundational wave 1: attention, graph, theme, settings, status-bar, progress (Sonnet agent; committed 2c3ce4db59; boot check stable)
- [x] Foundational wave 2: spotlight, simple-layout, testing (layout role), deck (careful), navtree (committed a073380f44; boot 3/3)
- [x] Foundational wave 3: plugin-space, plugin-registry, plugin-markdown (committed d9dac04902; boot 5/5, 182/182 dependency modules). Framework fixes found by the gate: dependency-pass failures now publish error activation messages (silent-hang fix); **compatFires are fire-and-forget tracked fibers** (awaiting legacy waves stalled startup); multi-consumed singleton definitions flipped (CreateObjectEntry, OnCreateSpace, OnTypeAdded) — arity rule added to MIGRATION-BRIEF.
- [x] **Unified activation model rewrite (1222d4c2c5, user-directed):** startup = default root event; requires-modules are chain members activating whenever providers contribute (any event's chain); event = special require that provides nothing (latching); pend-and-cascade replaces event-gated errors and bounded waits; structural problems (global+per-round cycles, duplicate providers, impossible requires) → plugin error state + continue, `_structurallyFailed` exclusion set; same-event topo ordering; in-flight modules excluded from cascades (deadlock fix). Residual boot flake = pre-existing composer ResetDialog race (startup.spec.ts documents it).
- [x] Leaf batch 1 (content types) + batch 3 (connectors) — committed e7ae6a5a89
- [x] Leaf batch 7 (tools) — committed 51270b5c37 (arity flips: DiagnosticProvider, RoutineCapabilities.Template)
- [x] Leaf batch 2 (kanban family) — committed 1beaf57e2c
- [x] Leaf batches 4+5 (games, markdown consumers) — committed 54e1bf7cf2 (arity flips: VariantProvider, FileCapabilities.Backend; comments' storybook agent stub stays legacy-shadowed pending override flag)
- [x] Leaf batches 6+8 (communication, platform) — committed c1aa6426ac (arity flips: CallTransportProvider, ObjectExtractor, MailboxAction, PageAction; boot 3/3)
- [x] Leaf batch 9 (shell/dev/onboarding): devtools (+.node), debug, onboarding (default-content stays event-mode on PersonalSpaceReady + requires), support (on-space-created stays event-mode on SpaceCreated)
- [x] Leaf batch 10 (misc): payments, preview, search (fixed unhoisted layout atom in connector), trip (hoisted state/cache atoms; hard rule at app-graph-builder.ts), commerce (AttentionCapabilities.Attention requires kept per work-list despite no direct read), magazine (+.workerd; hard rule fix; NavigationPathResolver/NavigationTargetResolver mismatch caught+fixed), video, sample (+.node/.workerd; dead `capabilities` var removed; node.ts barrel also converted)
- [x] Special case: plugin-brain — LayerSpec idiom in fact-store.ts (provides FactStoreRegistry + LayerSpec)
- [x] Special case: plugin-assistant (+.node/.workerd) — 3 LayerSpec providers (ai-context, agent-service, ai-service); hybrid `get(yield* Capability.get(State))` in app-graph-builder.ts collapsed to hoisted atoms (:99 action-closure get is fine, :141-142 was the real violation); EdgeModelResolver/LocalModelResolver → dependency-mode (AiModelResolver already multi); AssistantEvents.SetupAiServiceProviders deprecated; SetupArtifactDefinition firesBeforeActivation dropped (all producers already migrated, confirmed via repo-wide grep); CompanionChatProvisioner's 4-event allOf → 7 requires (drops event entirely)
- [x] Special case: plugin-observability — architectural decision: plugin-client depends on plugin-observability (confirmed via subagent + repo cycle checker), so mirrored `ObservabilityCapabilities.ClientCapability`/`IdentityCreatedEvent` (by identifier, already precedented for ClientCapability) instead of a real package dep; found+fixed a genuine duplicate-provider bug (both `observability` Startup module and `client-ready` module contributed the singleton `ObservabilityCapabilities.Observability`) by consolidating to one owner; ClientReadyEvent deprecated
- [ ] Special case: plugin-code (imperative SetupPluginAssets fire) — not in this batch's scope
- [ ] Scaffolding: app-toolkit playground, stories-\*, story-modules
- [ ] ui-editor: confirmed out of scope (CodeMirror ViewPlugin, not app-framework)

## Phase 8 — Delete legacy API + scaffolding

- [ ] Remove legacy addModule shape, fires{Before,After}Activation, ordering-only events, compatFires, legacy Startup wave + waitFor bridge, 'legacy' spec arm, window shims
- [ ] Rewrite/delete legacy-only tests
- [ ] Gate: full build + full test suite + lint/format; e2e Composer check (pure new-world)

## Landing

- [ ] Changesets (@dxos/app-framework, @dxos/app-toolkit, touched plugins)
- [ ] Full suite: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`; `moon run :lint -- --fix`; `pnpm format`
- [ ] submit-pr skill

## Session checkpoint 2026-07-17 (capacity-conservation mode)

- Committed through 38f3a26d63 (batches 9+10 + specials). UNCOMMITTED in tree: final sweep
  (connector, bookmarks, plugin-files dead-code deletion, scaffolding + storybook fixtures;
  residual fires\* grep EMPTY) and plugin-routine remainder (agent in flight).
- Next steps for the driving session (delegate everything heavy to Sonnet agents):
  1. When routine agent completes: one agent runs the boot gate (recipe above; probe
     manager legacyRemaining — must be [] except plugin-comments story stub) and reports.
  2. Review `git diff --stat`, commit sweep+routine → Phase 7 CLOSED.
  3. Dispatch Phase 8 agent with PHASE8-BRIEF.md (deletion + all landing gates).
  4. Review, commit, boot-gate once, changesets, submit-pr skill.

## Phase 9 — API ergonomics (user-directed, 2026-07-18)

User direction: plugins are a uniform chain of `Plugin.addLazyModule`; per-capability sugar
moves from the plugin level (`AppPlugin.addXModule`) to the capability level (`AppCapability`
module makers); no explicit types where main had none; multi is the default capability arity
(`Capability.make` = multi, `Capability.makeSingleton` = the marked case).

- [x] Arity flip: `make` → multi, `makeSingleton` → singleton; repo-wide rename (63 files);
      full build green (commit 84b9e789ff)
- [x] `Capability.Module` (renamed from LazyModule), `Capability.inlineModule` (eager pairing
      of lazyModule), `Capability.moduleMaker`/`MakerOptions` (maker factory for capability
      owners), `Plugin.addLazyModule` props overload (options-taking plugins stay a chain)
- [x] app-toolkit `AppCapability`: makers for surface/settings/appGraphBuilder/skillDefinition/
      operationHandler/undoMappings/reactContext/reactRoot/navigationResolver/navigationHandler/
      commentConfig/textContent/anchorSort + value makers translations/schema/pluginAsset/
      commands. Makers return named generic interfaces (e.g. `SurfaceModule`) so plugin `.d.ts`
      emit names them instead of expanding foreign service types — kills the TS2883
      unused-import hack (commit 691710b77a)
- [x] plugin-space `SpaceCapability.createObject` maker (capability owners export makers)
- [x] Exemplars: plugin-markdown + plugin-client fully on `Plugin.addLazyModule` chains;
      TS2883 fake imports removed (remaining foreign-requires cases use honest `typeof`
      annotations); framework tests extended (inlineModule/moduleMaker/addLazyModule props)
- [ ] Boot gate on exemplars
- [ ] USER REVIEW of exemplar diffs, then full sweep: migrate all ~90 plugins off
      `AppPlugin.addXModule` (616 call sites), then delete `AppPlugin`
- [ ] Sweep cleanup: remove remaining TS2883 fake-import blocks (212 files), investigate the
      2 explicit-generic `Plugin.addLazyModule<...>` workarounds (DeckPlugin, InboxPlugin)
