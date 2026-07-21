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
- [x] Boot gate on exemplars — passed (rolled into the full-repo build gate below)
- [x] `Capability.Module<Options>` made opaque (parameterized only by its options type;
      requires/provides are erased runtime values, so no module export leaks foreign
      capability types into declaration emit); `activatesOn`/props move onto the
      lazyModule/inlineModule specs; `Plugin.addLazyModule` reduces to bare module
      references; `AppCapability` makers collapse to one-liners (commit fd9b18e785)
- [x] USER REVIEW of exemplar diffs → approved; full sweep executed: partial salvage of an
      interrupted sweep agent (attention, board, chess, conductor, deck, explorer, markdown
      variants; commit cfbb93adb1), wave 1 (42 packages: assistant..crx, debug..kanban,
      linear..pipeline; commit 43f62ff4a2), wave 2 (41 packages: presenter..sidekick,
      simple-layout..thread, tictactoe..zen + app-toolkit playground/stories-inbox fixtures;
      commit ef6796567a) — all ~89 plugin packages off `AppPlugin.addXModule`
- [x] `AppPlugin` deleted — zero call sites remained after the sweep; introspect indexer's
      schema detection updated to match `AppCapability.schema([...])` instead of
      `addSchemaModule({ schema: [...] })` (commit 08e8245830)
- [x] Node-barrel drift fix: four plugins' node-only `#capabilities` barrels (plugin-client,
      plugin-routine, plugin-space, plugin-testing) hadn't received the `activatesOn`/props
      spec migration and had regressed to startup activation under node; root-caused via
      cli:test fresh-profile failures (`space.IdentityCreated` activating at startup), fixed
      (commit 4442a51dff); cli:test 24/24 green
- [x] Phoenix watchdog import fix — detached watchdog binary still imported the
      pre-rolldown `dist/lib/node-esm` path after the vite+rolldown build layout change
      merged from main (commit e700f932c0)
- [x] composer-app: capability-activation module audit — 432-module inventory from the live
      plugin manager, tiered startup-deferral plan; `AUDIT.md` §12 + `AUDIT-modules.md`
      (commit 7dd1c8d8a1)
- [x] Sweep cleanup: TS2883 fake-import blocks removed by the opaque-module core rework;
      3 remaining compiler-forced `Plugin.addLazyModule<...>` explicit-generic anchors
      identified (see Follow-ups)
- [x] Composer boot gate — 3/3 runs booted with `failed: []` (429–430 active of 432 modules)
- [x] composer-app e2e — 22 passed / 17 skipped / 1 failed; the sole failure is the
      pre-existing `basic.spec.ts "reset device"` flake (`waitForRequest(INITIAL_URL, 45s)`
      races the post-reset navigation). Confirmed NOT a refactor regression: DEBUG-traced the
      reset path across 3 runs — `onReset` fires and `window.location.pathname='/'` executes
      identically on pass and fail runs, so the new `props`-mapping wiring is intact. Passes
      ~2/3 standalone (matching the documented base-commit flake rate). An earlier "4/4 fail"
      was an orphaned preview server holding port 4173, not the test.

Gates: full-repo build green; full test suite green (cli:test 24/24 after the node-barrel
fix, all other packages unaffected); boot gate 3/3; e2e green modulo the pre-existing
reset-device flake.

### Follow-ups

- Startup-deferral opportunities identified by the module audit —
  `packages/apps/composer-app/AUDIT.md` §12 (tiered plan: post-paint `AfterStartup` event for
  cold providers, type-presence gating for content-type plugins, on-demand pull for operation
  handlers; full lists in `AUDIT-modules.md`).
- The `Maker<C>` type alias in `app-toolkit/src/app-framework/AppCapability.ts` guards TS2883
  on three makers whose capability tag's type structurally carries a type this package
  doesn't re-export (e.g. `@dxos/compute`'s `Skill.Definition`); kept as an explicit
  annotation rather than left to inference.
- One `Plugin.addLazyModule<void>` anchor remains, in a plugin-magazine story
  (`MagazineCurate.stories.tsx`) — the two in `src` (plugin-inbox `Connector`, plugin-navtree
  `State`) were removed below.

### Post-closure addendum — unnecessary module id audit (2026-07-20)

User-prompted audit of every `Plugin.addLazyModule(X, { id })`/raw `Plugin.addModule({ id, ... })`
site repo-wide, now that every module carries its own tag from where it's authored:

- [x] 8 redundant `{ id }` overrides removed (module already tagged; override was just a
      kebab-case restyle, unreferenced by any test/consumer): plugin-debug (`StatsPanel`),
      plugin-preview (`PreviewPopover`), plugin-assistant (`AutomationTemplates`,
      `MarkdownExtension`), plugin-onboarding (`DefaultContent`, `Onboarding`),
      plugin-magazine (`RoutineTemplates`), plugin-support (`SupportSettings`)
- [x] plugin-onboarding's `OAuthRecoveryRedirect` override dropped + its test updated to
      assert the default tag instead of the kebab string
- [x] 3 files' raw `Plugin.addModule({ id, activate: <inline> })` sites (leftover from
      before lazy modules existed) converted to tagged `Capability.inlineModule` in their
      capabilities barrels + bare `Plugin.addLazyModule`: plugin-navtree (`expose`),
      plugin-inbox (`contact-extractor`, `summarize-extractor`, workerd `operation-handler`).
      This let the `Plugin.addLazyModule<void>` compiler-forced anchors on `State` and
      `Connector` (respectively) be removed too — the raw `addModule` shape mixed into the
      chain was the cause of the inference collapse.
- [x] plugin-observability (`observability`, `namespace`) and plugin-comments
      (`agent-identity`) converted the same way, using the module spec's `props` mapping
      for their options-dependent values
- [x] Left untouched, confirmed structurally necessary (not a naming issue): plugin-observability
      `log-downloader` (declared `provides` is itself conditional on plugin options — a static
      module spec can't express that) and plugin-comments `agent-runner-override` (branches
      between two entirely different module shapes depending on options)

Gates: build+test green for all 10 touched packages; one pre-existing `plugin-assistant`
failure (`can run memoized instructions`, `ServiceNotAvailable`) confirmed unrelated via
`git stash` A/B; full-repo build green; lint/format clean.

### Reopened addendum — dissolve addLazyModule + workerd #capabilities barrel (2026-07-21)

Committed `e93156f8` (pushed to `claude/app-framework-capability-activation-0gaz6c`).
**UNBUILT / UNTESTED** — moon could not self-initialize this session (proto binary
download from GitHub release assets 403'd by egress policy). Validation is the next
agent's first job.

- [x] Dissolved `Plugin.addLazyModule` into `Plugin.addModule` (`core/plugin.ts`): two
      `Capability.Module` overloads added, `addLazyModule` removed. Runtime dispatch keys on
      `typeof fn === 'function' && Capability.ModuleTag in fn`; record/factory/`(builder,opts)`
      direct-call paths unchanged. `plugin.test.ts` block renamed
      `'addModule (spec-carrying module)'`. All 167 call-site files swept
      `Plugin.addLazyModule` → `Plugin.addModule`; zero occurrences remain.
- [x] plugin-assistant workerd `#capabilities` barrel (approach A): new
      `src/capabilities/workerd.ts` (server-safe `lazyModule`s for SkillDefinition/
      OperationHandler/Toolkit; module ids preserved as `skill-definition`/`operation-handler`/
      `toolkit`). `package.json` `#capabilities.source` now `{ workerd, default }` + `workerd`
      dist condition. `AssistantPlugin.workerd.ts` imports the three from `#capabilities`
      instead of hand-written `inlineModule` wrappers. Node/browser unchanged (→ `default`).
      Mirrors plugin-connector/plugin-routine.
- [x] VALIDATE (2026-07-21): `moon run app-framework:build` green; `moon run app-framework:test`
      green (201/201, 16 files — overload resolution had no fallout); `moon run
    plugin-assistant:build` green (workerd `#capabilities`→`workerd.ts` resolution +
      check-module-structure gate passed); `moon exec --on-failure continue --quiet :build`
      full-repo green (exit 0, no failures); `moon run app-framework:lint
    plugin-assistant:lint` clean; `pnpm format` reformatted 5 files whose line widths shifted
      after the `addLazyModule`→`addModule` rename (pure whitespace, no semantic change) —
      committed alongside.
- [x] No overload-resolution regressions found — all 167 swept call sites compiled and passed
      identically under the merged `addModule` overloads.

Remaining pre-existing follow-ups (from before, still open): startup-deferral opportunities
in composer-app/AUDIT.md §12; one `Plugin.addModule<void>` (was `addLazyModule<void>`) anchor
in a plugin-magazine story; the `plugin-assistant` "can run memoized instructions" failure
(compute-runtime LayerStack, unrelated to this refactor).

### Second reopened addendum — NSID-branded capability identifier (Option B) (2026-07-21)

User flagged TS2883 phantom-import workarounds (`unused-imports/no-unused-imports` +
explanatory comment) scattered across ~150 module bodies, tracing back to `CapabilityIdentifier<T,
A>` branding the Effect requirement channel by the capability's **service type** `T` — a
namespace-exported, non-portable service type (e.g. `@dxos/compute`'s `OperationHandlerSet`,
`Skill`) forces every consuming body's emitted `.d.ts` to name it. Considered and rejected
`@internal` + `stripInternal` per-body annotation (153 files, ongoing authoring tax); landed on
re-branding the identifier by the capability's **NSID string literal** instead — mirrors Effect's
own `Context.Tag`/`Effect.Service`, whose requirement identity is a nominal token (the `Self`
class), never the structural service shape.

- [x] `capability.ts`: `CapabilityIdentifier<Id extends string, A>` (was `<T, A>`); `Tag<T, S =
      any>`/`MultiTag<T, S = any>` (default `any` — `Context.Tag` is invariant in its identifier, so
      a bare `Tag<Example>` annotation must accept every concrete `Tag<Example, "the.actual.nsid">`,
      which `S = string` would reject under invariance). `make`/`makeSingleton` are dual-form:
      curried `make<T>()(nsid)` captures the NSID as a literal (precise, portable — the
      Effect-idiomatic shape); legacy `make<T>(nsid)` is a transitional shim that widens `S` to
      `string` (still portable, coarser check). `MissingServiceType` template-literal guard mirrors
      Effect's `MissingSelfGeneric` (omitting `<T>` in the curried form is a compile error, not a
      silent vacuous check). `provide`/`provideAll`/`contributions` widened to `Tag<any, any>` /
      `MultiTag<any, any>` at their generic-constraint positions (the invariance fallout).
- [x] Curried ~188 `make`/`makeSingleton` call sites across 63 tag-definition files (mechanical
      bracket-matching sweep, handles nested generics/multi-line calls).
- [x] Renamed ~37 pre-existing capability NSIDs whose final segment violated `DXN.Name`'s
      camelCase-only rule (kebab-case or too few segments, e.g. `capability.view-state` →
      `capability.viewState`, `story-state` → `org.dxos.test.storyState`) — previously silently
      unchecked because the non-curried form always widened `S` to `string` before validating,
      making `DXN.Name`'s compile-time check vacuous. Curry-checking every tag surfaced them for
      real; user chose to fix the names now rather than leave them on the legacy shim.
- [x] Removed the now-provably-dead TS2883 phantom-import workaround from ~120 body files whose
      leak was purely on the **requires** side (`yield*` accumulating the identifier into `R`) —
      confirmed dead via full-repo build (TS2883 is a hard error, so anything still needed
      resurfaced immediately).
- [x] **Discovered and preserved a second, separate leak the identifier fix does NOT address**:
      `Capability.provide(tag, value)` returns `Contribution<typeof tag>`, and `Contribution<C>`'s
      `capability: C` field embeds the tag's full type — including its service type `T` — regardless
      of how the identifier is branded. Any body that `provide()`s a tag whose service type is
      itself non-portable (namespace-exported, e.g. `OperationHandlerSet`, `Skill`) still needs its
      phantom import. ~30 files restored for this reason (the ~88 `operation-handler.ts`/
      `skill-definition.ts` bodies providing `Capabilities.OperationHandler`/
      `AppCapabilities.SkillDefinition`, plus a handful of `provide()`-ing barrels). Also applies at
      **tag *definition* sites** whose own service type is structurally non-portable (e.g.
      `plugin-client/types/capabilities.ts`'s `IdentityService`/`SpaceService` embedding
      `Identity.Service`/`Space.Service` → `@dxos/halo`'s `Invitation.Flow`/`ShareOptions`) — the
      definition's own exported `Tag<T, S>` still names `T` directly, identifier branding aside.
      Left as an open, unsolved problem — no attempt made to make `Contribution<C>`/tag-definition
      emit opaque to `T` (would need its own design pass, likely trading off the
      `EnsureProvides`/`CoveredBy` completeness-check machinery, similar tension to the identifier
      fix).
- [x] Also restored ~10 files whose phantom import was for a **root cause unrelated to
      capabilities entirely** (Effect Schema classes via `Type.makeObject`, `Operation.withHandler`
      definitions, a React context type) — same workaround pattern, different underlying
      TS2883 trigger; the identifier fix was never going to touch these.
- [x] Gate: full-repo build (`moon exec --on-failure continue --quiet :build`) green across ~6
      iterations (each iteration's fix unmasked the next hidden failure — a failed package blocks
      moon from even attempting downstream consumers, so fixes surfaced one dependency-layer at a
      time); full-repo test suite green modulo 2 confirmed load-induced timeout flakes unrelated to
      this change (`echo-react:usePagination`, `client:dedicated-worker-client-services` /
      `client-service` — both pass cleanly standalone, both timeout only under
      `MOON_CONCURRENCY=4 :test` full-suite CPU contention); full-repo lint clean; `pnpm format`
      reformatted 5 files.

Net: portability is unconditional now (identifier branding never names the service type, curried
or legacy) — every body's `.d.ts` is portable regardless of curry status. The **sharper
per-capability requires-check** only applies where the tag is curried (~all 63 definition files,
after this pass). The **provides-side leak** (`Contribution<C>` embedding `T`) and the
**definition-site leak** (a tag's own `Tag<T,S>` naming `T`) are real, separate, still-open
problems — flagged above, not fixed this pass.
