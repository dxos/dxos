# Demand-signal substrate — seed-hypothesis answers (2026-07-31)

Phase 1 deliverable ([DESIGN.md](./DESIGN.md) seed-hypothesis table): for each family, whether the
demand signal is statically declarable today or needs substrate, with the minimal substrate named.
Verified against source on this branch (post capability-activation refactor).

## Q1 — Surface role declarability: statically declarable (extractable), not yet declared; no miss path exists

- Role is never computed from body state. `Surface.create` derives `role` from the filter's
  bindings (`app-framework/src/ui/components/Surface/types.ts:218-254`); every filter combinator
  takes a `Role.Role` token as first argument, and a sweep of all 70
  `plugins/*/src/capabilities/react-surface.tsx` files finds zero runtime-computed roles.
  The one dynamic factory (`AppSurface.deckCompanion(variant)`, `app-surface.ts:595-602`) is
  passed a string literal at all 8 producer sites — only consumers are dynamic.
- Prior art for build-time extraction exists but is broken: `reflect/introspect`'s
  `readRoleProperty` (`indexer/plugins.ts:475-499`) still reads the pre-refactor literal `role:`
  property, so `list_surfaces` returns empty roles.
- **Miss path: none.** `SurfaceComponent.tsx:229-231` returns `null` (dev) or renders an empty
  candidate list — the `placeholder` is only a `React.lazy` Suspense fallback and never renders on
  a role miss. `Surface.useIsAvailable` (`:311`) gives false negatives for unloaded modules.
- **Minimal substrate:** (1) `roles?: readonly Role.Role<any>[]` on `MakerOptions`
  (`core/capability.ts:592-607`) threaded to `ModuleSpec`/`Module`; (2) repair the introspect
  extractor as a drift guard; (3) a miss hook in the renderer: role→modules lookup from specs,
  activate, throw the pending promise into the existing `placeholder`/Suspense.

## Q2 — Operation→module map: needs substrate; a miss is an immediate hard failure

- `OperationInvoker._resolveHandler` is a linear `findLast` over registered handlers
  (`operation/src/OperationInvoker.ts:200-224`); a miss fails with `NoHandlerError` immediately —
  no wait, no resolution hook. The handler set itself is reactive
  (`process-manager-capability.ts:109`), so late contributions are visible.
- No static operation→module declaration exists (checked `Operation.Definition.meta`,
  `MakerOptions`, the `operationHandler` maker, `OperationRegistry.resolve`). The
  key-embeds-plugin naming convention is unsound: `LayoutOperation.Open` is defined under a
  non-existent `org.dxos.plugin.layout` and handled by four plugins (deck, simple-layout,
  spotlight, testing) — key→plugin is many-to-many.
- The three barrier consumers confirmed: `ProcessManagerPlugin.ts:12-26`,
  `plugin-deck/src/capabilities/index.ts:20-33`, `plugin-routine/src/capabilities/index.ts:21-33`.
  A multi require is a SOFT edge (`activation-graph.ts:21-22,119`): it pins providers only
  because they are dependency-mode roots in the same round. Flipping providers to event-mode
  no-ops the soft edge — no deadlock risk.
- On-demand pull machinery exists for event-mode requires only
  (`activation-scheduler.ts:523-560`).
- **Minimal substrate:** (1) `handles?: readonly Operation.Definition.Any[]` on `MakerOptions` —
  the handler claims the operation (definitions are already statically imported by callers, so
  no chunk weight); (2) an `onMissingHandler` resolution hook in the invoker's miss branch
  (activate → re-resolve once → fail); (3) move `RegistrySync`/`NotificationTracker` to
  `activatesOn: SpacesReady`, and drop ProcessManager's `OperationHandler` require (it only feeds
  the reactive set — the LayerSpec snapshot is a separate concern).

## Q3 — urlKey / PathResolution: derived, not static — but trivially hoistable

- `buildUrlKeyTable` scans `builder.getExtensions()` — the live registry — recomputed per call
  (`app-graph/src/path-resolution.ts:85-146`). Extensions register only when a graph-builder
  module body runs; every `url:` declaration sits inside a chunk (~26 sites enumerated). A cold
  deep-link today requires all graph-builder modules resident.
- Every `key` in the codebase is a string literal (two dynamic `path` resolvers, both with
  literal keys). `TypeSection.createTypeSectionExtension` already takes `urlKey` options as
  literals at all 7 call sites.
- Miss behaviour: unknown key → not-found sentinel; known key that doesn't resolve → bounded
  retry loop against `NavigationTargetLoader` (`url-handler.ts:134-178`) — the natural place to
  hang load-and-retry.
- **Minimal substrate:** (1) `urlKeys?: readonly { key: string; kind: 'item'|'singleton' }[]` on
  `MakerOptions` (kind is needed — `hasId` derives from it); (2) split `buildUrlKeyTable` into a
  pure table constructor with `fromBuilder`/`fromSpecs` adapters; conflict detection becomes a
  build-time assertion; (3) parse-then-load in the url-handler: tokenize against the static
  table, activate exactly the owning modules, then resolve as today.

## Q4 — Ready-space type inventory: needs substrate; TypeAdded structurally cannot cover pre-existing data

- `SpaceEvents.TypeAdded` fires only from the `AddType` operation handler
  (`plugin-space/src/operations/add-type.ts:31-35`) — on schema registration, not object
  presence. `table.on-type-added` is the right mechanism (chunk-free `inlineModule` parked on an
  event) with the wrong trigger for pre-existing data.
- `ClientEvents.SpacesReady` fires on the FIRST `client.spaces.subscribe` callback
  (`plugin-client/src/capabilities/client.ts:68-83`) — before individual spaces are
  `SPACE_READY`; consumers must filter per-space readiness (`spaces-ready.ts:168`).
- No aggregate "distinct typenames present" query exists, BUT: a disjunction of typename filters
  compiles to ONE indexed `TypeSelector` scan (`echo-host/src/query/query-planner.ts:442-455`),
  and the candidate typename set is already statically known at boot for free —
  `AppCapability.schema(types)` is a chunk-free inlineModule collected eagerly
  (`AppCapability.ts:129-133`, `schema-defs.ts:18-25`). Schema-stays-eager is what makes this
  substrate free.
- Parameterized activation events already exist and are unexercised: `ActivationEvent.specifier`
  + `compositeKey` (`activation-event.ts:14,33-44`).
- **Minimal substrate:** (1) `SpaceEvents.TypePresent` specifier-keyed by typename;
  content-type modules declare `activatesOn: TypePresent(typename)`; (2) a type-presence watcher
  in plugin-space on SpacesReady: per SPACE_READY space, one reactive
  `Query.select(Filter.or(...candidates))` (collapses to a single TypeSelector), firing the
  composite event per distinct typename first observed — covers pre-existing data and subsumes
  TypeAdded; (3) deck-restored planks pointing at not-yet-fired types are the failure mode —
  covered by Q1's surface-miss hook, which is therefore a blocker for this family.

## Cross-cutting conclusion

Three of four families converge on ONE substrate change: a declaration field on
`MakerOptions`/`ModuleSpec` next to `activatesOn` — `roles` (Q1), `handles` (Q2), `urlKeys` (Q3);
all values are already module-level constants, so hoisting costs no bytes. The genuinely new
runtime work is two near-identical miss paths (surface-miss → activate → suspend on existing
placeholder; handler-miss → activate → re-resolve) plus Q4's type-presence watcher (one indexed
query per ready space). Q4 needs no spec field at all.
