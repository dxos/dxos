# Capability-dependency activation for `@dxos/app-framework`

## Context

Module activation ordering in app-framework is hand-wired today: modules declare `activatesOn` events plus `firesBeforeActivation`/`firesAfterActivation`, and a zoo of ordering-only events (`Setup*`/`*Ready`, `ClientReady`, …) exists solely to sequence activation. Missing capabilities surface as runtime `invariant` failures, and every module's `activate` Effect has a hardcoded R channel (`Capability.Service | Plugin.Service | Scope.Scope`) regardless of what it actually uses.

This refactor makes capability dependencies the source of ordering and the type system the enforcer:

```ts
Plugin.addModule({
  provides: [Capabilities.ProcessManagerRuntime],
  requires: [Capabilities.FeedTraceSink],
  activate: ProcessManagerCapability,
});
```

Capabilities become yieldable Effect services (`yield* Capabilities.Foo`), so accessing an undeclared capability or failing to return a declared one is a **type error**, and the manager topologically orders activation at runtime.

**User decisions (final):**

1. **Scope**: full migration — the PR does not land until **all ~180 plugins** are on the new API. The legacy API and coexistence machinery exist only as intra-PR scaffolding (keeps the build green between phases) and are **deleted in the final phase**, not deprecated.
2. **Events**: `Startup` goes away for migrated modules. Exactly two mutually exclusive activation modes, enforced as a discriminated union — **dependency mode** (`provides` required, `requires` optional; activates during startup dependency resolution) or **runtime-event mode** (`activatesOn` a genuine runtime event — SpaceCreated, parameterized state/settings events; activates when the event fires). Ordering-only events are eliminated for migrated modules.
3. **Enforcement**: type-level (R channel constrained to `requires`; return must cover `provides`) AND runtime (topo sort, cycle/missing-provider/duplicate-provider/provides-mismatch fail-fast with tagged errors).
4. **Arity**: capabilities are typed **singleton** (`Capability.make` → `yield*` yields the impl; requiring gates on the provider) or **multi/registry** (`Capability.makeMulti` → `yield*` yields a live `Contributions<T>` collection; providers never gate consumers). Singleton and multi APIs don't cross (type error).

## Key design decisions

**REVISED ACTIVATION MODEL (2026-07-17, user-directed).** "Startup" is not a mode — it is the
default root event. A module with no `requires` is a root triggered by `activatesOn`
(implicitly Startup). A module with `requires` is a **chain member**: it activates once every
declared singleton capability has been contributed — by whichever event's chain produced the
providers — additionally gated on `activatesOn` when declared (an event is a special require
that provides nothing; fired events latch). Consequences implemented in the manager:

- Consumers of event-gated providers **pend** (no error, no bounded wait) and **cascade**
  alive when the provider contributes; every event wave triggers a cascade round; activation
  rounds run to a fixpoint. Requires-only modules (`{requires, activate}`) are valid.
- Structural problems never hard-fail startup: cycle members (detected globally across event
  boundaries and per-round), duplicate singleton providers, and impossible requires put the
  owning plugins into an **error state** (failed atom + error activation message) and are
  excluded from further rounds (`_structurallyFailed`, re-evaluated on enable) while
  everything else proceeds.
- Same-event provider/consumer pairs are topologically ordered (event waves route typed
  modules through the wave machinery with per-module contribution).
- In-flight modules (memoized loads) are excluded from cascade candidates — a cascade
  awaiting a module that is itself awaiting the triggering event wave would deadlock.
- compatFires and legacy contribution windows inside dependency modules must never be
  awaited by the pass (fire-and-forget tracked fibers) unless the module snapshots the
  contributions (process-manager's LayerSpec window is the awaited exception).

- **Runtime-event modules** may declare `requires` (resolved when the event fires; inactive dependency-mode providers are pulled on demand) and `provides` (land in the shared registry but do not participate in startup ordering — a dependency-mode module requiring a capability provided only by an event-gated module fails startup with `MissingProviderError { hint: 'event-gated' }`).
- **Startup roots**: the startup pass activates ALL enabled dependency-mode modules (topo order); `provides: []` + no `requires` is the `activatesOn: Startup` replacement. `provides` is the required discriminant of dependency mode.
- **`activate` returns an unordered array of `Capability.provide(...)` contributions** (not a Layer/Context/positional tuple): multi capabilities are registry entries not services, per-contribution `deactivate` hooks survive, and ~500 existing `contributes(...)` returns migrate mechanically. Completeness is checked by an `EnsureProvides` conditional-type intersection on the activate function; the runtime validator is authoritative.
- **`Capability.Service` / `Plugin.Service` stay ambient** in R (framework infrastructure needed by deprecated helpers during the migration window).
- **Coexistence**: `start()` runs the dependency pass **concurrently** with the legacy Startup event wave (strict sequencing deadlocks either way). Both worlds share the string-keyed `CapabilityManager`, so contributions are mutually visible. A migrated consumer whose singleton require has only a legacy provider falls back to `capabilities.waitFor(...)` bounded by the activation timeout.
- **Multi soft edges**: the topo pass best-effort orders same-pass multi providers before declared multi consumers (dropped on cycle, never a guarantee); documented contract stays "the collection is live, consume reactively".
- **Duplicate singleton providers** among dependency-mode modules fail fast (`DuplicateProviderError`); an `override` flag is a recorded follow-up, not in scope.
- **`compatFires`**: migrated modules can declare legacy events the framework fires after their activation (e.g. `ClientReady`) so unmigrated listeners keep working.

## Critical files

- `packages/sdk/app-framework/src/core/capability.ts` — tags, arity, contributions, typed makeModule/lazy
- `packages/sdk/app-framework/src/core/capability-manager.ts` — add `contributions()` live view
- `packages/sdk/app-framework/src/core/errors.ts` (new) — tagged errors
- `packages/sdk/app-framework/src/core/plugin.ts` — module discriminated union, addModule overloads
- `packages/sdk/app-framework/src/core/plugin-manager.ts` — dependency pass, `start()`, coexistence (single provisioning site today: `_loadModule` ~:1529–1637)
- `packages/sdk/app-framework/src/common/capabilities.ts`, `src/common/activation-events.ts` — arity flips, event deprecations
- `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts` — dependency-mode migration
- `packages/sdk/app-toolkit/src/app-framework/AppPlugin.ts`, `AppCapabilities.ts`, `AppActivationEvents.ts` — sugar helpers emit dependency-mode modules
- `packages/plugins/plugin-client/src/ClientPlugin.ts` + `src/capabilities/*` — worked example

**Reuse, don't reinvent**: `LayerSpec.make` (`packages/core/compute/compute/src/LayerSpec.ts`) proves the `const Opts extends Types.NoExcessProperties<...>` + `Context.Tag.Identifier<Opts['requires'][number]>` inference idiom on effect 3.21.4; `ServiceResolver` (same dir) proves runtime `tag.key` resolution; `Capability.asLayer` already bridges string capability → tag layer. Errors via `BaseError.extend` from `@dxos/errors` (resolves TODO at capability.ts:35).

## Load-bearing new types

```ts
// capability.ts — arity-branded, yieldable tags
export type Arity = 'single' | 'multi';
declare const CapabilityBrand: unique symbol;
export interface CapabilityIdentifier<T, A extends Arity> {
  readonly [CapabilityBrand]: { readonly type: T; readonly arity: A };
}
/** Live reactive view over all contributions to a multi capability. */
export interface Contributions<T> {
  readonly atom: Atom.Atom<readonly T[]>;
  get(): readonly T[];
  subscribe(cb: (values: readonly T[]) => void): () => void;
}
// Singleton: genuine Context.Tag (yield* → T) AND legacy InterfaceDef<T> (identifier alias),
// so all existing get/getAll/waitFor/atom/useCapability call sites keep compiling.
export interface Tag<T> extends Context.Tag<CapabilityIdentifier<T, 'single'>, T>, InterfaceDef<T> {
  readonly arity: 'single';
}
export interface MultiTag<T> extends Context.Tag<CapabilityIdentifier<T, 'multi'>, Contributions<T>>, InterfaceDef<T> {
  readonly arity: 'multi';
}
// make keeps its exact signature (DXN.Name validation) but returns Tag<T>; add makeMulti.
// Impl: Object.assign(Context.GenericTag(identifier), { identifier, arity }) with the same
// controlled brand cast the file already uses (capability.ts:113). tag.key === identifier.

// Contributions (activate success type)
export interface Contribution<C extends AnyTag> {
  /* phantom-branded by C; capability, values, deactivate? */
}
export const provide: {
  <C extends Tag<any>>(capability: C, impl: C extends Tag<infer T> ? T : never, deactivate?): Contribution<C>;
  <C extends MultiTag<any>>(capability: C, impl: C extends MultiTag<infer T> ? T : never, deactivate?): Contribution<C>;
};
export const provideAll: <C extends MultiTag<any>>(capability: C, impls: readonly T[], deactivate?) => Contribution<C>;

export type ProvidesReturn<Provides extends readonly AnyTag[]> = Provides extends readonly []
  ? void | readonly []
  : ReadonlyArray<Contribution<Provides[number]>>;
export type EnsureProvides<Ret, Provides extends readonly AnyTag[]> = [Provides[number]] extends [CoveredBy<Ret>]
  ? unknown
  : { readonly 'Missing declared capabilities in activate return': Exclude<Provides[number], CoveredBy<Ret>> };
export type Requirements<Requires extends readonly AnyTag[]> =
  | Context.Tag.Identifier<Requires[number]>
  | Service
  | Plugin.Service
  | Scope.Scope;
```

```ts
// plugin.ts — the discriminated union (dependency mode: provides required, activatesOn?: never;
// event mode: activatesOn required). New addModule overloads placed before the deprecated legacy one.
export function addModule<
  T,
  const Requires extends readonly Capability.AnyTag[] = readonly [],
  const Provides extends readonly Capability.AnyTag[] = readonly [],
  Ret extends Capability.ProvidesReturn<Provides> = Capability.ProvidesReturn<Provides>,
>(options: DependencyModuleOptions<Requires, Provides, Ret> | EventModuleOptions<Requires, Provides, Ret>
    | ((pluginOptions: T) => ...)): (builder: PluginBuilder<T>) => PluginBuilder<T>;
// activate: (() => Effect<Ret, Error, Capability.Requirements<Requires>>) & Capability.EnsureProvides<Ret, Provides>
// PluginModule gains `activation: ActivationSpec` ('dependency' | 'event' | 'legacy'); legacy fields become deprecated getters.
// Capability.makeModule / Capability.lazy get spec-carrying typed variants; specs declared EAGERLY at the
// addModule / lazy site (topo ordering must not require loading the chunk). Old lazy overload stays deprecated.
```

Tagged errors (`src/core/errors.ts`): `CapabilityNotFoundError`, `ModuleActivationError`, `DependencyCycleError` (context: path), `MissingProviderError` (context: capability, requiredBy, registered, hint), `DuplicateProviderError`, `ProvidesMismatchError` (missing/undeclared). Retrofit `Capability.get`/`waitFor`; replace the `/No capability found for/` regex sniff at plugin-manager.ts:1607 with `CapabilityNotFoundError` checks.

## Manager algorithm (plugin-manager.ts)

- New `start()`: idempotent; runs `_activateDependencyGraph()` concurrently with the legacy `_activateEvent(Startup)`; publishes the event-level Startup `activated` PubSub message **last** (preserves the `useApp.tsx:207` ready contract). `activate(Startup)` delegates to `start()` — useApp/harness/cli/testing call sites unchanged.
- `_activateDependencyGraph(candidates)`: build singleton provider index (dup → `DuplicateProviderError`); per require: satisfied if already contributed → hard edge if provider is an inactive candidate → waitFor-bridge if only legacy modules could provide → `MissingProviderError` (with `event-gated` hint when applicable). Kahn topo on hard edges (cycle → `DependencyCycleError` before soft edges); add multi soft edges, drop any that cycle; activate wave-by-wave with unbounded concurrency, reusing `_moduleMemoMap` deferreds, per-module semaphores, scopes, `_activationTimeout`, `_recordFailure`/auto-disable, PubSub messages.
- `_activateModule`: build `Context` from `requires` (singleton → impl via `Context.add(ctx, tag, impl)`; multi → `capabilities.contributions(tag)`), provide it + ambient services + scope; validate returned contributions exactly match `provides` (`ProvidesMismatchError`); contribute synchronously per module completion (the sync-contribution constraint at :1502 holds — gating is wave ordering); then fire `compatFires`.
- `activate(otherEvent)`: event-mode modules matching the key resolve requires first (on-demand topo pull of inactive dependency-mode provider closures), then run through the same activation path; the untouched legacy wave (fires-before/after) runs alongside. Mode guard so dependency-mode modules never match event queries.
- Dynamic **enable after start**: incremental dependency pass over just that plugin's modules; failures scoped to that plugin. **disable**: deactivate active dependents of the disappearing singleton first (reverse topo, recursive), record in `_pendingReactivate`, reactivate when a provider returns. **shutdown**: unchanged (reverse activation order is reverse topo). **lazy plugins**: unchanged; specs are eager.

## Phases (each independently buildable/testable)

1. **Capability tags + arity + contributions + errors** — capability.ts, capability-manager.ts (`contributions()` over the existing atom family), errors.ts, index.ts. Gate: full-repo typecheck (Tag<T> assignable to InterfaceDef<T> keeps ~180 plugins compiling untouched); new `capability.test.ts` (yieldability, arity cross-use `@ts-expect-error`, Contributions reactivity); extend capability-manager.test.ts.
2. **Module union + builder + typed makeModule/lazy** — plugin.ts, capability.ts.
3. **Manager: dependency pass + coexistence** — plugin-manager.ts (the big one). New `describe('capability dependency activation')` in plugin-manager.test.ts.
4. **Core migrations** — common/capabilities.ts arity flips (multi: ReactContext, ReactRoot, ReactSurface, Command, Layer, LayerSpec, TraceSink, OperationHandler, UndoMapping; rest singleton); AppCapabilities arity flips (multi: Translations, Schema, AppGraphBuilder, Settings, PluginAsset, SkillDefinition, Toolkit, TextContent, CommentConfig, Navigation*, AnchorSort); `AppPlugin.addXModule` helpers emit dependency-mode modules (e.g. addTranslationsModule → `provides: [AppCapabilities.Translations]`; addSettingsModule adds `compatFires: [createSettingsEvent(id)]`), legacy opt-out kept; process-manager-capability → dependency mode (requires AtomRegistry/LayerSpec/TraceSink/OperationHandler, provides ProcessManagerRuntime/ServiceResolver/ProcessMonitor/OperationInvoker, `compatFires: [ProcessManagerReady]`, keeps the inline `Plugin.activate(SetupProcessManager)` legacy-window shim, resolves the Scope-finalizer TODO at :128); deprecate ordering events (Startup-as-target, Setup*, \*Ready) — still exported and fired for legacy plugins; keep createStateEvent/createSettingsEvent + plugin-domain runtime events.
5. **plugin-client migration (worked example)** — Client module: `provides: [ClientCapabilities.Client, Capabilities.Layer]`, `compatFires: [ClientEvents.ClientReady]`; ClientReady-listeners become `requires: [ClientCapabilities.Client]`; `allOf(SpacesReady, ProgressRegistryReady)` → `activatesOn: SpacesReady` + `requires: [AppCapabilities.ProgressRegistry]`; SetupSchema/SetupMigration windows → multi requires (`AppCapabilities.Schema`, `ClientCapabilities.Migration` flipped to makeMulti); capability bodies swap `Capability.get(...)` for `yield* Tag` and `contributes(...)` for `provide(...)`.
6. **Testing utils + docs** — testing/withPluginManager.tsx, harness.ts, service.ts accept new-style modules; rewrite the `org.dxos.app-framework.moduleActivationOrdering` idiom doc (plugin.ts:80–95).
7. **Migrate all remaining plugins (~180 across packages/plugins/\*, plus app-framework/app-toolkit stragglers, stories, ui-editor).** Mechanical pattern per plugin, established by Phase 5's plugin-client example:
   - `activatesOn: Startup/Setup*` module → dependency mode (`provides` from what its activate contributes; `requires` from its `Capability.get/waitFor` calls).
   - `activatesOn: <X>Ready` / `allOf(...)` → `requires: [<capability behind the Ready event>]`, keeping `activatesOn` only for genuine runtime events; `firesAfterActivation: [<X>Ready]` → the capability itself (drop the event) or `compatFires` while unmigrated listeners remain mid-PR.
   - Audit each plugin-defined custom event (~10 event modules: plugin-client, plugin-space, plugin-script, plugin-assistant, plugin-attention, plugin-wnfs, plugin-observability, …): runtime occurrences (SpaceCreated, IdentityCreated, …) stay events; ordering-only events (ClientReady-style) are replaced by capabilities and deleted.
   - Bodies: `Capability.get(X)` → `yield* X` (declared in `requires`); `contributes(...)` → `provide(...)`/`provideAll(...)`; multi-window consumers (`getAll`/`atom`) → `yield*` of the multi tag's `Contributions`.
   - Order the work by the capability graph: foundational providers first (plugin-space, plugin-graph, plugin-settings, plugin-deck/layout, plugin-attention), then leaf plugins in independent batches — batches are parallelizable (worktree-isolated subagents at execution time). Gate per batch: `moon run <pkg>:build` + `:test`; full `moon exec --on-failure continue --quiet :build` after each wave.
8. **Delete the legacy API + scaffolding.** Remove the legacy `addModule`/`PluginModuleOptions` shape, `firesBeforeActivation`/`firesAfterActivation`, the ordering-only events (`Startup` as an `activatesOn` target, `SetupReactSurface`, `SetupProcessManager`, `ProcessManagerReady`, all app-toolkit `Setup*`/`*Ready`), `compatFires`, the legacy Startup wave and waitFor bridge in `start()`, the `'legacy'` ActivationSpec arm, and the legacy-window shims (e.g. the inline `Plugin.activate(SetupProcessManager)`). Keep: `ActivationEvent` type + `make`/`oneOf`/`allOf`, parameterized `createStateEvent`/`createSettingsEvent`, `PluginManager.activate(event)` for runtime events, and the string-keyed `Capability.get/getAll/atom` + React hooks (they serve dynamic access outside modules, not ordering). No compatibility re-exports (repo rule). Update plugin-manager.test.ts: legacy-only tests (fires-before/after, Startup event waves) are rewritten against the new semantics or deleted with the feature; the rest of the suite plus the new dependency tests are the regression gate.

This is a multi-session effort — register it in the project registry (`$project new app-framework-capability-activation`) with TASKS.md tracking per-phase and per-batch progress, and checkpoint with `$hydrate` between sessions.

## Model & effort per phase

Main session: **Fable, high effort** — it orchestrates throughout and implements the core phases directly.

| Phase                                                       | Model                                                           | Effort      | Why                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–3 (tags, module union, manager)                           | Fable (main session)                                            | high        | Edge-of-inference TypeScript (`const` params, `EnsureProvides` intersection, arity branding assignable to `InterfaceDef` repo-wide) and concurrency/deadlock reasoning in the 1700-line manager, where a wrong ordering decision is a flaky boot, not a test failure. Escalate to xhigh only if a specific inference or coexistence problem gets stuck — not as the default. |
| 4–6 (core migrations, plugin-client example, testing utils) | Fable (main session)                                            | medium–high | Pattern-establishing: errors here multiply across ~180 plugins in Phase 7, so keep in the strong session.                                                                                                                                                                                                                                                                    |
| 7 (~180 plugin batches)                                     | Sonnet subagents (`model: sonnet`), worktree-isolated, parallel | medium      | Mechanical once plugin-client is the template; the one judgment call per plugin (custom event: runtime occurrence vs ordering-only) needs Sonnet-level care, not Haiku. Fable spot-reviews the first 1–2 batches before scaling out; per-batch build+test gates are the real correctness backstop.                                                                           |
| 8 (legacy deletion) + final review                          | Fable (main session)                                            | high        | Deletion is where subtle behavioral dependencies on the old Startup wave surface; the final code-review/verify pass over a diff this size deserves the strongest model.                                                                                                                                                                                                      |

The bottleneck in Phase 7 is verification discipline more than model intelligence — budget wall-clock for the `moon` gates and the two end-to-end Composer checks regardless of model.

**Delegation note**: throughout all phases, delegate down whenever a subtask doesn't need the main session's context or judgment. Candidates: broad code searches and call-site inventories (Explore agents), mechanical repo-wide renames/sweeps once a pattern is fixed (Sonnet), running and triaging build/test/lint gates (Sonnet, or Haiku for pure run-and-report), drafting per-plugin event audits for review, and changeset/doc boilerplate. Keep in the main Fable session anything that sets a pattern others will copy, touches the manager's concurrency, or resolves a type-inference problem. Match agent effort to the subtask (low for run-and-report, medium for mechanical edits) rather than inheriting the session's high effort.

Changesets: `@dxos/app-framework` and `@dxos/app-toolkit` (major-leaning minor — API replacement) plus touched plugin packages per `agents/instructions/changesets.md`. No new dependencies. Follow no-cast rule (brand-boundary casts follow the existing capability.ts:113 idiom); namespace-export style throughout.

## Test plan

- **Acceptance gate through Phase 7**: all existing plugin-manager.test.ts legacy tests (events, allOf, custom events, shutdown, timeouts, dependsOn) pass untouched — coexistence must not regress mid-PR. In Phase 8 the legacy-only ones are rewritten/deleted with the feature.
- New runtime tests: topo chain ordering + yielded impls; wave concurrency; `provides: []` startup root; MissingProviderError (+ event-gated hint) / DependencyCycleError / DuplicateProviderError / ProvidesMismatchError; multi consumer activates with empty live collection + reactive updates + same-pass soft ordering; event-mode on-demand provider pull; event-mode provides satisfy later requires but not startup; legacy waitFor bridge (+ timeout); compatFires ordering; dynamic enable/disable/reactivate; mixed shutdown reverse order; timeout on dependency-mode module; Startup PubSub message ordering (useApp contract).
- Type-level tests (`@ts-expect-error`): arity API crossing; undeclared `yield*` rejected via R; missing declared provide rejected via EnsureProvides; union exclusivity (activatesOn + provides-only shapes); legacy options still compile.

## Verification

1. `moon run app-framework:test` and `moon run app-toolkit:test`, `moon run plugin-client:test` after each phase.
2. Full-repo typecheck/build after Phases 1, 4, each Phase-7 wave, and Phase 8: `moon exec --on-failure continue --quiet :build` (Tag/InterfaceDef compatibility is the repo-wide gate until Phase 8).
3. Full test suite before landing: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`; `moon run :lint -- --fix` + `pnpm format`.
4. End-to-end: run Composer via storybook/dev app (`moon run storybook-react:serve`) after Phase 5 (mixed legacy/new coexistence) and again after Phase 8 (pure new-world): app boots, spaces load, surfaces/translations/settings render — i.e. the multi-capability registries populated correctly without Setup\* windows.

## Risks / follow-ups (recorded, not blocking)

- Phantom branding by T+arity means two capabilities with identical T are type-interchangeable in R (runtime tag.key resolution stays exact). Future: optional class-based nominal tags.
- One-shot multi snapshots (LayerStack) rely on soft ordering; late-enabled plugin contributions don't join — same as today's window semantics. Follow-up: reactive LayerStack.
- Legacy consumers racing new providers keep their ordering events until their Phase-7 batch; failures now yield diagnosable tagged errors.
- Provider override/substitution (dev-plugin shadowing) → future `override` flag.
- Out-of-repo/registry-loaded plugins built against the legacy API break at Phase 8 (hard API removal, no shims per repo policy) — acceptable pre-1.0; note in the changeset.
