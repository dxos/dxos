# Phase 8 brief — delete the legacy API + landing gates

Precondition: Phase 7 fully committed (zero legacy modules outside app-framework fixtures and
the plugin-comments storybook stub). Work in the assigned worktree; never create branches or
commit unless the driving session says so; run all commands synchronously.

## A. Framework deletions (packages/sdk/app-framework)

1. `src/core/plugin.ts`:
   - Delete `PluginModuleOptions` (legacy type), the legacy `addModule` overloads (keep the
     typed one + direct-call variant retyped to typed options), the `'legacy'` arm of
     `ActivationSpec`, `firesBeforeActivation`/`firesAfterActivation` everywhere
     (PluginModule deprecated getters included), and `normalizeActivation`'s legacy branch
     (no requires/provides/activatesOn now means: startup root, `{mode:'dependency',
requires:[], provides:[]}`).
   - Delete `compatFires` from ActivationSpec/TypedModuleOptions/ModuleEntry and all plumbing.
   - Keep: `activatesOn` (event mode), `ModuleEntry` (erased), `ValidateModuleOptions`,
     `addLazyModule`.
2. `src/core/capability.ts`: delete legacy `lazy` (LoadCapability/LoadCapabilities/
   NormalizeReturn/LazyCapability), `contributes`/`Capability<T>`/`Any`/`ModuleReturn` IF no
   remaining callers (grep first — hooks/manager bookkeeping use `Any` internally: keep the
   internal entry type but move/rename if needed), `expandContributions` legacy passthrough
   stays (contributions only). `makeModule` retyped to contributions-only return.
3. `src/core/plugin-manager.ts`:
   - Delete the legacy wave machinery: `_loadCapabilitiesForModules`,
     `_contributeCapabilitiesForModules` batch path, `_getBeforeEvents`/`_getAfterEvents`,
     `_activateRelatedEvents`, the legacy branch in `_activateModulesForEvent` (event waves
     become: pull providers → typed chain → latch key → publish), the `hasLegacyModules`
     waitFor-bridge branch in `_activateDependencyRound` (unknown-provider + no registered
     provider is now always MissingProviderError→error state), and legacy-mode guards that
     become dead.
   - `start()`: drop `suppressEventMessage` plumbing if the legacy Startup wave is gone —
     keep firing the event-level Startup `activated` message after the dependency pass
     (useApp ready contract).
   - `compatFires` firing in `_activateDependencyModule`: delete.
4. `src/core/activation-event.ts` + `src/common/activation-events.ts` +
   app-toolkit `AppActivationEvents.ts`: delete deprecated ordering-only events (Startup
   stays as the delegating key + useApp call sites; SetupReactSurface/SetupProcessManager/
   ProcessManagerReady/Setup\*/AppGraphReady/ProgressRegistryReady deleted). KEEP
   `createStateEvent`/`createSettingsEvent` and runtime events. Update all remaining
   references (grep each deleted symbol; the window shims in plugin-graph/process-manager
   (`Plugin.activate(Setup...)`) get deleted with their events; plugin-code's imperative
   SetupPluginAssets fire too).
5. `AppPlugin.ts` (app-toolkit): delete the legacy branch of `addCapabilityModule`
   (hasLegacyWiring path), the deprecated activatesOn/fires\* option fields, and the legacy
   activate union arm; helpers become dependency-mode always (validate every remaining call
   site compiles — callers now all pass requires/provides or use value-bearing helpers).
6. Deprecated ClientEvents/SpaceEvents/etc. ordering events (ClientReady, SetupSchema,
   SetupMigration, PersonalSpaceReady, SetupSettingsPanel, StateReady families,
   AttentionReady, SetupExtensions, DependenciesReady, SetupAiServiceProviders,
   ObservabilityEvents.ClientReadyEvent): delete definitions AND their compatFires
   references in plugin entries (grep `compatFires` repo-wide — remove the option from each
   call site; plugin-onboarding listens on PersonalSpaceReady: convert that module to
   requires or keep the event as a genuine runtime event if plugin-space still fires it
   imperatively — check; if only compatFires fired it, convert onboarding's default-content
   to requires on what it actually needs (it reacts to identity creation: move it to
   `activatesOn: ClientEvents.IdentityCreated` + requires, matching plugin-space's
   IdentityCreated module ordering via a capability if needed).
7. plugin-comments storybook agent stub (override-by-shadowing): now that legacy mode is
   gone, implement the minimal fix — either the story provides the stub via a separate
   story-only plugin loaded INSTEAD of the real agent-runner module, or skip/rework the
   story. Do not add an override flag to the framework in this phase.
8. `src/testing/withPluginManager.tsx` fixtures + app-framework tests
   (plugin-manager.test.ts, useApp.test.tsx, react.test.tsx, SurfaceComponent.test.tsx):
   rewrite legacy-only tests against the new semantics or delete them with the feature
   (events/allOf/custom-event tests translate to event-mode modules; fires\* tests die;
   keep/extend the dependency-activation suite as the regression gate).

## B. Gates (all must be green before handing back)

1. `moon run app-framework:build app-framework:test app-toolkit:build app-toolkit:test`
2. Full repo: `moon exec --on-failure continue --quiet :build > /tmp/p8build.log 2>&1; echo EXIT=$?`
   — must be EXIT=0; on failure grep "error TS" and fix every hit (deleted-symbol fallout).
3. Full test suite: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism` (long; grep
   summary lines; fix or report every failure with analysis).
4. `moon run :lint -- --fix` on touched packages; `pnpm oxfmt` touched files.
5. Composer boot gate (see TASKS.md "Gate recipe"): moon run composer-app:serve, headless
   chromium, `treeView.userAccount` within 150s cold + 2 warm runs, zero failed plugins,
   `legacyRemaining` from the manager must be [] (probe: modules where activation.mode ===
   'legacy'). Known flake: the pre-existing ResetDialog "System Error" race — retry, and
   verify plugin state is clean on any failing run.

## C. After Phase 8 (driving session)

Changesets per agents/instructions/changesets.md (@dxos/app-framework, @dxos/app-toolkit
minor with breaking-change notes; touched plugins patch); then the `submit-pr` skill.
