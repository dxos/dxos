# Clusters: testing, effect, react-ui, echo, process, other

Input: 185 principles across 106 PRs. Clusters: 28 (dropped 41 single-PR clusters).

## 1. reuse-shared-test-layer-not-hand-rolled-mock: Build tests on the project's shared test layer/helper, never a hand-rolled mock or duplicate setup

- comments: 19 · PRs: 12 · authors: dmaretskyi, mykola-vrmchk, richburdon · seed: one-mechanism-per-concern · existing: `testing-assistant-conversations` skill (`AssistantTestLayer`) · confidence: high
- principle: When a shared test layer, database fixture, faker utility, or helper already exists for the dependency under test, wire that in rather than constructing a bespoke mock, stub, or `Layer.mergeAll` stack that reimplements the same setup.
- flag: a test file that builds its own in-memory mock/stub for a service, database, or peer that a sibling test already gets from a shared layer or `testing/` module; a custom `Layer` stack duplicating one that exists; hand-rolled fixture data where a shared faker/random utility exists.
- do not flag: the first test in a package establishing a genuinely new shared layer; a trivial one-line local helper whose body is a single call to the real API (that is `no-trivial-wrappers-over-official-apis`, the opposite failure — inlining the real API call is correct there).
- fix: import the existing shared test layer/helper/fixture (e.g. `AssistantTestLayer`, a package's `testing/` module export) and delete the local duplicate.
- examples: https://github.com/dxos/dxos/pull/10711#discussion_r2914097609, https://github.com/dxos/dxos/pull/10897#discussion_r3030833642, https://github.com/dxos/dxos/pull/11002#discussion_r3088141603, https://github.com/dxos/dxos/pull/11236#discussion_r3189623322, https://github.com/dxos/dxos/pull/11584#discussion_r3387615234

## 2. test-the-real-scenario-not-a-narrower-proxy: A test must exercise the actual behavior it claims to cover, not a scripted, single-case, or lower-fidelity stand-in

- comments: 9 · PRs: 9 · authors: dmaretskyi · seed: one-mechanism-per-concern · existing: none · confidence: medium
- principle: When a test claims to cover an end-to-end path, an agent's tool use, a distributed property, or a new integration point, it must drive the real production code (the actual operation, the actual agent invoking its own tool, both streaming and non-streaming modes, a genuine multi-peer run, the standard public API) rather than a scripted stand-in, a single narrower case, or a parallel test-only implementation of the flow.
- flag: a test harness that performs the agent's action on its behalf instead of letting the agent invoke the tool; an e2e-labeled test built on a bespoke test-only layer that reimplements production logic; a redundant lower-fidelity unit test kept alongside an e2e test that already covers the same behavior; a feature with two code paths (streaming/non-streaming) tested on only one; a new query/integration source tested only through an internal helper instead of the public API.
- do not flag: a genuine unit test of a pure function with no cross-cutting production flow to exercise; a lower-fidelity test that covers a case the e2e test does not.
- fix: route the test through the real operation/agent/API and delete or fold in the narrower substitute.
- examples: https://github.com/dxos/dxos/pull/10934#discussion_r3050615600, https://github.com/dxos/dxos/pull/10968#discussion_r3064050220, https://github.com/dxos/dxos/pull/10295#discussion_r2614704742, https://github.com/dxos/dxos/pull/11084#discussion_r3133569763, https://github.com/dxos/dxos/pull/11383#discussion_r3274006268

## 3. design-system-primitives-not-raw-divs: Build structural UI from the design system's layout/composite primitives, never raw divs or ad hoc markup

- comments: 8 · PRs: 6 · authors: richburdon, thure, wittjosiah · seed: none · existing: `org.dxos.review.ui#no-styling-wrapper-divs`, `#no-native-form-controls`, `#toolbars-are-menu-actions` · confidence: high
- principle: Structural regions (dialogs, toolbars, headers, containers, forms, primitives meant to be consumed like a text input) come from the design system's own components (`Container`/`Flex`/`Grid`, `Toolbar.Root`, `Dialog.Header`/`Body`, `Card.Header`, `Form`) — a primitive component also owns its own layout so consumers don't need wrapper divs around it.
- flag: `<div>`/`<span>` trees styled with utility classes to look like a toolbar, dialog body, or card header; a hand-rolled input/state pair where the component already uses the design system's `Form`; a "primitive" component whose consumers must wrap it for ordinary layout.
- do not flag: genuinely ad hoc positioning no primitive expresses, when the diff says why.
- fix: replace the ad hoc markup with the matching design-system component.
- examples: https://github.com/dxos/dxos/pull/9964#discussion_r2414936444, https://github.com/dxos/dxos/pull/10658#discussion_r2874055735, https://github.com/dxos/dxos/pull/10849#discussion_r3003554588, https://github.com/dxos/dxos/pull/10897#discussion_r3030939539, https://github.com/dxos/dxos/pull/11018#discussion_r3103369585

## 4. reference-platform-identity-mechanism-not-adhoc-field: Model identity/relationships to other domain entities with the platform's own reference mechanism, not a duplicate ad hoc field

- comments: 8 · PRs: 6 · authors: dmaretskyi, richburdon · seed: none (close to `one-mechanism-per-concern`) · existing: `org.dxos.review.code-style#operations-take-refs-not-ids` (partial — that rule is operation inputs specifically, this is broader: schema fields, foreignKeys, annotations) · confidence: medium
- principle: When a type's field represents an existing domain entity, an external system's id, or a well-known piece of schema metadata, use the platform's own mechanism for it — a typed `Ref` to the canonical shared type, a relation, `meta.foreignKeys`, or a dedicated schema annotation — instead of inlining a duplicate ad hoc field or overloading a generic key/value slot.
- flag: a new type field that duplicates fields already on a canonical shared type instead of referencing it; a custom external-id field instead of `meta.foreignKeys`; a low-level derived identifier (a DXN) passed around instead of a typed `Ref` to the owning object; a well-known metadata key stuffed into a generic `meta.key` instead of its own annotation.
- do not flag: a field that genuinely has no existing canonical counterpart yet; an id that crosses a real serialization boundary where a lightweight string is the established wire shape.
- fix: add/use the `Ref`, relation, `foreignKeys`, or annotation instead of the duplicate field, and use the existing helper (e.g. `Obj.getKeys`) to read it.
- examples: https://github.com/dxos/dxos/pull/11018#discussion_r3103390875, https://github.com/dxos/dxos/pull/11025#discussion_r3112881818, https://github.com/dxos/dxos/pull/10861#discussion_r3008152231, https://github.com/dxos/dxos/pull/12615#discussion_r3794621061, https://github.com/dxos/dxos/pull/12853#discussion_r3892145579

## 5. no-mixed-promise-effect-use-effect-lifecycle: Once an interface is Effect-based, keep its whole surface in Effect

- comments: 5 · PRs: 5 · authors: dmaretskyi, wittjosiah · seed: none · existing: none (adjacent to CLAUDE.md "Prefer Effect over async/Promise") · confidence: high
- principle: Do not mix Promise-returning methods into an otherwise Effect-based service or module; wrap the remaining Promise method in Effect, handle its errors through Effect's typed-error mechanisms, and use Effect's own lifecycle primitives (`Scope.Scope`) instead of ad hoc `open()`/`close()`.
- flag: a service interface where some methods return `Promise<T>` and others `Effect<T, E>`; a plain `throw new Error(...)` inside `Effect.gen`; manual `.open()`/`.close()` calls on a resource instead of the framework's resource-lifecycle wrapper or `Scope`.
- do not flag: a true platform boundary (dynamic `import()`, a browser callback API) — that is where Promises are supposed to live, per CLAUDE.md.
- fix: convert the remaining Promise-returning methods to Effect and route lifecycle through Scope or the shared resource wrapper.
- examples: https://github.com/dxos/dxos/pull/9896#discussion_r2392065488, https://github.com/dxos/dxos/pull/10024#discussion_r2439718941, https://github.com/dxos/dxos/pull/12614#discussion_r3791381700, https://github.com/dxos/dxos/pull/13261#discussion_r4062337256, https://github.com/dxos/dxos/pull/10217#discussion_r2545732660

## 6. layer-composition-hygiene: Compose Effect layers flatly, as module-level values, with a single provide and no redundant wiring

- comments: 7 · PRs: 4 · authors: dmaretskyi · seed: one-mechanism-per-concern · existing: `effect` skill (`layer-composition.md`: "hoist shared fixtures to module scope"; `provide` vs `provideMerge`); adjacent to `org.dxos.review.code-style#namespace-service-layers` · confidence: medium
- principle: Define Effect layers as module-level `const`s rather than nesting their construction in a function closure; break a monolithic inline layer into focused, named layers; merge and `Effect.provide` once rather than chaining several provides; don't re-provide a dependency the layer graph already resolves; don't wrap a value in an extra Layer when the tag can hold it directly.
- flag: a layer built inside a function body instead of at module scope; several chained `Effect.provide` calls that could be one `Layer.mergeAll`; an explicit provide of something already satisfied by the graph; a resource-acquiring function that returns only an `Effect`, forcing callers to hand-roll the `Layer.provide` composition themselves.
- do not flag: a layer that must be parameterized per call and genuinely cannot be a static module value.
- fix: hoist the layer to module scope, merge and provide once, add a `Layer`-returning variant alongside the `Effect`-returning one.
- examples: https://github.com/dxos/dxos/pull/11054#discussion_r3129706252, https://github.com/dxos/dxos/pull/10966#discussion_r3064267273, https://github.com/dxos/dxos/pull/12147#discussion_r3553801863, https://github.com/dxos/dxos/pull/12210#discussion_r3579618972

## 7. story-coverage-for-new-ui-components: A new UI container/component ships with a Storybook story at the right level, with a resting-state snapshot

- comments: 5 · PRs: 4 · authors: richburdon, wittjosiah · seed: none · existing: none · confidence: medium
- principle: New UI components and containers need a story; the story targets the lowest-level component that actually needs the story's dependencies (a container's story renders the container itself, a plain component's story doesn't drag in client/database/plugin-manager it never uses), and ships with a resting-state image snapshot.
- flag: a new container/component PR with no `.stories.tsx`; a story that renders a lower-level child instead of the container under review, or that wires up client/database dependencies a plain component never touches.
- do not flag: a component with no meaningful visual state to snapshot (a pure logic hook, a non-visual utility).
- fix: add the story at the correct component level and attach a resting-state screenshot.
- examples: https://github.com/dxos/dxos/pull/10719#discussion_r2923831311, https://github.com/dxos/dxos/pull/9965#discussion_r2414999310, https://github.com/dxos/dxos/pull/10897#discussion_r3030832938, https://github.com/dxos/dxos/pull/11023#discussion_r3151240535

## 8. no-cast-to-silence-type-checker: Never cast to make a type error go away; fix the type at its source

- comments: 5 · PRs: 4 · authors: dmaretskyi, wittjosiah · seed: none · existing: CLAUDE.md Non-negotiables ("No casts to silence the type-checker"); `org.dxos.review.non-negotiables#no-casts` · confidence: high
- principle: `as any` (or any other silencing cast) used to make a build pass hides a real type mismatch; fix the underlying types, generics, or overloads, or build the value through the existing typed factory function instead.
- flag: `as any`, a cast used to force a return type to match, or a value constructed and then cast rather than built via the real factory.
- do not flag: `as const`.
- fix: resolve the actual mismatch (correct generics/overloads) or call the existing factory function.
- examples: https://github.com/dxos/dxos/pull/10242#discussion_r2576906554, https://github.com/dxos/dxos/pull/10861#discussion_r3008158289, https://github.com/dxos/dxos/pull/11034#discussion_r3110524955, https://github.com/dxos/dxos/pull/13248#discussion_r4059126486

## 9. extract-non-rendering-logic-out-of-component: Move logic that isn't about rendering out of the component body and into a hook or plain function

- comments: 4 · PRs: 4 · authors: dmaretskyi, richburdon, wittjosiah · seed: none (adjacent to `no-impossible-state-handling`) · existing: none · confidence: medium
- principle: A derived-state computation, a repeated open-on-mount/close-on-unmount lifecycle pattern, or any non-rendering logic inlined in a component body should be factored into a named hook or plain function — including a long hook stacked with defensive non-null checks, which should be split into smaller, well-typed pieces instead.
- flag: an inline `useMemo`/`useEffect` building a filter/query or managing a resource's lifecycle directly in a component; a hook whose body is mostly `if (!x) return` guards on its own inputs.
- do not flag: a small, genuinely one-off derivation with no reuse potential and no complexity to hide.
- fix: extract a named hook (e.g. a generic `useResource(get, deps)`) or well-typed helper function and call it from the component.
- examples: https://github.com/dxos/dxos/pull/10024#discussion_r2439823314, https://github.com/dxos/dxos/pull/9963#discussion_r2414680065, https://github.com/dxos/dxos/pull/10252#discussion_r2581485390, https://github.com/dxos/dxos/pull/10595#discussion_r2834212440

## 10. design-tokens-not-raw-tailwind: Use existing semantic design tokens instead of raw Tailwind classes or arbitrary values

- comments: 6 · PRs: 3 · authors: thure, wittjosiah · seed: none · existing: `org.dxos.review.ui#no-invented-theme-tokens` (near-exact) · confidence: high
- principle: Spacing, sizing, and color should come from the design system's existing semantic tokens (`is-48`, `text-subdued`, `text-blueText`) rather than raw Tailwind palette classes or bracketed arbitrary values, and visually related components should share the same token rather than drifting apart without a stated reason.
- flag: a raw Tailwind color/spacing class (`text-blue-500`, `w-[12rem]`) where a semantic token exists; a sibling component using a different token for the same visual role with no explanation.
- do not flag: functional layout utilities (`p-4`, `space-y-4`) that aren't color/token questions.
- fix: swap in the matching semantic token, and align sibling components on one token.
- examples: https://github.com/dxos/dxos/pull/9891#discussion_r2380558993, https://github.com/dxos/dxos/pull/9918#discussion_r2400863813, https://github.com/dxos/dxos/pull/10237#discussion_r2568345502

## 11. extend-existing-query-filter-api-not-parallel-mechanism: A new query/reference capability extends the existing Filter/Query DSL and its typed helpers, not a parallel ad hoc one

- comments: 4 · PRs: 3 · authors: dmaretskyi, wittjosiah · seed: one-mechanism-per-concern · existing: none · confidence: high
- principle: When ECHO needs a new capability for querying, ordering, or reference conversion, it belongs on the existing `Filter`/`Query` API and its typed helper functions — not as a standalone type, a bespoke scope-specific option, or hand-rolled sort/parsing logic.
- flag: a new standalone type or option living beside `Filter`/`Query` instead of folded into it; a local reimplementation of sort/ordering or reference-conversion logic that a shared `Order`/DXN helper already provides.
- do not flag: a genuinely new query primitive with no existing analog to extend.
- fix: fold the new capability into `Filter`/`Query`, and call the existing typed helper instead of hand-rolling it.
- examples: https://github.com/dxos/dxos/pull/12615#discussion_r3790898660, https://github.com/dxos/dxos/pull/9982#discussion_r2422085862, https://github.com/dxos/dxos/pull/10400#discussion_r2730408694

## 12. derive-dont-duplicate-state-echo: Store the canonical source once and derive the rest; don't mirror state into a second field or signal

- comments: 3 · PRs: 3 · authors: dmaretskyi, richburdon · seed: state-owned-once · existing: `org.dxos.review.ui#write-through-the-live-object` ("derive, don't sync") covers the general form · confidence: medium
- principle: When a derived representation (an AST from a grammar string, a UI signal from a query's own live results) is always needed, store only the canonical source and derive the rest on demand — and a single designated identifier field is the sole source of truth for referencing something, never duplicated in a second field.
- flag: a schema/type persisting both a canonical field and its derived form independently; a query's results manually copied into a separate signal instead of subscribing to the query's own reactivity; two fields that both claim to identify the same thing.
- do not flag: caching a derived value behind a memoized getter that recomputes from the single source when it changes (that's still one source of truth).
- fix: make the source the only persisted field and compute the derived form from it; subscribe to the query directly instead of mirroring it.
- examples: https://github.com/dxos/dxos/pull/9897#discussion_r2411539688, https://github.com/dxos/dxos/pull/10067#discussion_r2460108800, https://github.com/dxos/dxos/pull/10913#discussion_r3248937847

## 13. wrap-repeated-service-access-in-helper: Give a repeated "yield* the service tag, then call a method" pattern a standalone function

- comments: 3 · PRs: 3 · authors: dmaretskyi · seed: none (adjacent to `one-mechanism-per-concern`) · existing: none · confidence: low
- principle: When every caller has to `yield*` a service tag out of context and then invoke its method, expose that as a standalone function (e.g. via `Effect.serviceFunction` or a module-level helper) so callers call it directly.
- flag: repeated `const svc = yield* Service; svc.method(...)` at multiple call sites for the same service/method pair.
- do not flag: a single call site, or a service accessed differently depending on context (no real duplication yet).
- fix: add the standalone wrapper function and use it at call sites.
- examples: https://github.com/dxos/dxos/pull/9896#discussion_r2394501074, https://github.com/dxos/dxos/pull/10951#discussion_r3058751183, https://github.com/dxos/dxos/pull/10376#discussion_r2656840663

## 14. test-must-assert-real-behavior: A test must actually run and assert on the real outcome, not be disabled, stripped, or merely check wiring

- comments: 3 · PRs: 3 · authors: dmaretskyi, wittjosiah · seed: none · existing: none (adjacent to `org.dxos.review.non-negotiables`) · confidence: medium
- principle: `test.only`/`describe.only` left in committed code silently skips the rest of the suite; commented-out assertions leave a test verifying nothing; a test that only checks a check exists and is wired up isn't enough — it must assert on the actual behavior the check is meant to catch.
- flag: `.only` on a test/describe block in a non-draft commit; assertions commented out or missing on the result under test; a test whose only assertion is presence/association rather than the real behavior.
- do not flag: `.only` in a clearly-marked local debugging commit not meant to land.
- fix: remove `.only`, restore real assertions, and add assertions on the actual behavior.
- examples: https://github.com/dxos/dxos/pull/10237#discussion_r2568313158, https://github.com/dxos/dxos/pull/9979#discussion_r2444149516, https://github.com/dxos/dxos/pull/13247#discussion_r4071026567

## 15. test-isolation-and-determinism: Tests and benchmarks must be properly isolated and wait on real signals, not sleeps or shared resources

- comments: 3 · PRs: 3 · authors: dmaretskyi · seed: none · existing: `org.dxos.review.non-negotiables#no-sleep-in-test` (covers the sleep/timeout half exactly) · confidence: medium
- principle: Isolate one-time setup cost out of a benchmark's measured block with real `beforeEach`/`beforeAll` hooks rather than lazy-memoized inline init; give tests proper resource isolation (separate processes) when one test's resource usage can affect a later one, rather than marking the flaky test reporting-only; never use a fixed sleep/timeout to wait for async state to settle — wait on a deterministic signal.
- flag: setup code lazily memoized inside the measured function; a flaky test suppressed as reporting-only instead of isolated; `sleep`/`setTimeout` used to wait for state to settle in a test.
- do not flag: a real macrotask turn a test genuinely needs across runtimes, stated as such.
- fix: move setup into a hook, isolate the resource, replace the sleep with awaiting the real condition/event.
- examples: https://github.com/dxos/dxos/pull/13199#discussion_r4044891766, https://github.com/dxos/dxos/pull/12649#discussion_r3811692719, https://github.com/dxos/dxos/pull/12750#discussion_r3861117847

## 16. catalog-is-single-source-of-truth-for-deps: Add, bump, and remove dependency versions in the workspace catalog, not in individual package.json files

- comments: 3 · PRs: 3 · authors: wittjosiah · seed: none · existing: REPOSITORY_GUIDE.md (pnpm catalog conventions), CLAUDE.md workspace-deps guidance · confidence: medium
- principle: The catalog (`pnpm-workspace.yaml`) is the one source of truth for a dependency's version — bump it there rather than in a package's own `package.json`, remove the catalog entry when its last consumer is removed, and classify a tooling-only dependency as `devDependencies`, never a runtime dependency.
- flag: a version bump made directly in a package.json instead of the catalog; a catalog entry left behind after its only consumer is deleted; a build/dev-only tool listed under `dependencies`.
- do not flag: a package.json entry that correctly points at the catalog (`workspace:*`/catalog reference) unchanged.
- fix: move the bump into the catalog, delete the orphaned catalog entry, move the dependency to `devDependencies`.
- examples: https://github.com/dxos/dxos/pull/10380#discussion_r2674394262, https://github.com/dxos/dxos/pull/9974#discussion_r2419896355, https://github.com/dxos/dxos/pull/10696#discussion_r3027919604

## 17. dont-duplicate-a-process-mechanism: Don't stand up a second process/tooling mechanism next to one that already covers the concern

- comments: 3 · PRs: 3 · authors: wittjosiah · seed: one-mechanism-per-concern · existing: none · confidence: medium
- principle: `one-mechanism-per-concern` applied to process and repo config: don't keep a duplicate historical record (a running task log) of what git history already tracks; don't add a CI step that duplicates work an existing step already does (full-repo lint beside affected-only lint); don't put a personal editor preference in shared project settings that affects every contributor.
- flag: a hand-maintained changelog/task-log duplicating git history; a new CI step whose coverage another step already provides; an editor preference added to a checked-in shared settings file.
- do not flag: a genuinely new CI check with no existing overlap; a project-wide setting the whole team needs, correctly placed in shared config.
- fix: drop the duplicate log/CI step, or move the preference to user-level settings.
- examples: https://github.com/dxos/dxos/pull/10614#discussion_r2860984000, https://github.com/dxos/dxos/pull/10685#discussion_r2891618104, https://github.com/dxos/dxos/pull/10716#discussion_r2919563354

## 18. dont-erase-effect-requirement-types-to-any: Propagate an Effect's generic requirement (R) type; never erase it to any or cast around it

- comments: 8 · PRs: 2 · authors: dmaretskyi · seed: none (adjacent to `no-casts`) · existing: `org.dxos.review.non-negotiables#no-casts` (partial — that rule is about casts generally; this is the Effect-specific "don't default/erase the R type parameter" failure mode) · confidence: medium
- principle: A cast used to force an Effect's return type to match hides a real service-requirement mismatch — provide the missing service in the layer instead of casting; a generic requirements type parameter must be threaded outward into the returned effect's own type rather than widened to `any`, and a requirement-narrowing `provide` function should compute the resulting type with the standard `Exclude<R, R0> | R2` formula, not a bespoke one.
- flag: `Effect.Effect<O>` with the requirement channel erased or cast; a function accepting/returning `any` where a generic `<R>` should be threaded through; a hand-written requirement-narrowing formula that isn't `Exclude<R, R0> | R2`.
- do not flag: an explicit, deliberate `never` requirement once all services are genuinely provided.
- fix: add/propagate the generic `<R>` parameter through the signature and provide the real missing service instead of casting.
- examples: https://github.com/dxos/dxos/pull/9896#discussion_r2392090168, https://github.com/dxos/dxos/pull/11034#discussion_r3110549544

## 19. no-wrapper-div-around-primitive-child: Never interpose a wrapper div between a composite primitive's Root/Trigger and its single required child

- comments: 4 · PRs: 2 · authors: thure, wittjosiah · seed: none · existing: `composite-components` skill (asChild / `ark.*` single-child contract) · confidence: high
- principle: A Radix/Ark `.Trigger` using `asChild`, or a structural slot like `StackItem.Root`'s `Surface` child, requires exactly one immediate actionable/structural element — not a styled wrapper div around it — and a composite's sub-parts are only used within their own `Root`.
- flag: a `<div>` between `asChild` and its target component; a sub-part rendered outside its `Root`; `asChild` given more than one child element.
- do not flag: a wrapper div that changes semantics deliberately and is not participating in `asChild`/slot composition.
- fix: remove the wrapper and pass the actionable component directly as the single child.
- examples: https://github.com/dxos/dxos/pull/10012#discussion_r2433349336, https://github.com/dxos/dxos/pull/10242#discussion_r2576957576

## 20. reactive-state-as-atom-not-adhoc-subscription: Expose reactively-observed state as an atom/signal through the established bridge, not a custom subscription hook

- comments: 3 · PRs: 2 · authors: dmaretskyi · seed: none · existing: `reactivity` skill (the Stream→Atom→useAtom bridge, and keeping React context limited to services) · confidence: medium
- principle: State a UI needs to observe reactively should be backed by an atom/signal via the established Stream-to-Atom-to-`useAtom` bridge, not a hand-written subscription hook or a one-shot Effect/promise-returning getter; a React context should stay limited to providing services and let hooks use the default reactive runtime rather than threading a custom one through it.
- flag: a custom `useEffect`+`useState` subscription hook reimplementing what the Stream→Atom bridge already does; a getter that returns a `Promise`/one-shot `Effect` for state the UI needs to watch; a custom reactive runtime threaded through context.
- do not flag: state that is genuinely one-shot (fetched once, never expected to change under the component).
- fix: back the value with an `Atom` and consume it via the standard bridge/`useAtom`.
- examples: https://github.com/dxos/dxos/pull/12185#discussion_r3587540903, https://github.com/dxos/dxos/pull/12807#discussion_r3878595103

## 21. service-as-tag-layer-via-shared-factory: Construct an Effect service via the shared factory (Tag + Layer), not an ad hoc raw Context.Tag or plain class

- comments: 3 · PRs: 2 · authors: dmaretskyi · seed: one-mechanism-per-concern · existing: `code-style` skill / `org.dxos.review.code-style#namespace-service-layers` (adjacent — that rule covers layer-export placement, this covers construction via the shared factory) · confidence: high
- principle: A service implementation should be built with the project's shared factory function (e.g. `Service.make`), producing a Tag + Layer pair that composes into the layer stack, rather than defined ad hoc with a raw `Context.Tag` class or instantiated as a plain class.
- flag: a new service defined as `class Foo extends Context.Tag(...)` without going through the shared factory; a service implemented as a plain class instantiated directly instead of Tag+Layer.
- do not flag: a `Context.Tag` used purely as a type, with no service construction happening at that site.
- fix: rewrite the definition with the shared `Service.make`-style factory.
- examples: https://github.com/dxos/dxos/pull/10966#discussion_r3064089079, https://github.com/dxos/dxos/pull/12147#discussion_r3553826492

## 22. use-schema-declare-and-brand-not-hand-rolled: Use Effect Schema's own utilities (Schema.declare, Brand) instead of hand-rolling the equivalent machinery

- comments: 3 · PRs: 2 · authors: dmaretskyi · seed: one-mechanism-per-concern · existing: none (candidate addition to `effect` skill's Schema section) · confidence: high
- principle: A Schema for a type identified by a runtime type guard should use `Schema.declare` with the predicate rather than hand-composing `Schema.Any` with custom refinement logic; a nominal/branded type should use Effect's `Brand.Brand<'...'>` rather than a hand-rolled `string & { unique symbol }` intersection, and trivial wrapper functions around the plain string should be dropped once Brand does the job.
- flag: `Schema.Any.pipe(...)` hand-composing what `Schema.declare(isX)` expresses directly; a hand-rolled `T & { unique symbol }` brand instead of `Brand.Brand<'...'>`; redundant wrapper functions around a now-branded plain value.
- do not flag: a predicate too dynamic/parameterized for `Schema.declare` to express cleanly.
- fix: replace with `Schema.declare(isX)` or Effect's `Brand` utility, and delete now-redundant wrappers.
- examples: https://github.com/dxos/dxos/pull/10204#discussion_r2541010745, https://github.com/dxos/dxos/pull/10913#discussion_r3248727564

## 23. layout-only-wrapper-invisible-to-a11y-dom: A wrapper element that exists only for layout should not appear as a meaningful node

- comments: 2 · PRs: 2 · authors: richburdon, wittjosiah · seed: none · existing: none · confidence: low
- principle: A wrapper that should not affect layout renders as a `Fragment` rather than a DOM element, and a purely layout/wrapping `<div>` that must remain a DOM node is marked `role='none'` so it does not pollute the accessibility tree.
- flag: a wrapper `<div>` added only to group children, with no `role='none'` and no `Fragment` alternative considered.
- do not flag: a wrapper that also carries styling/semantics beyond pure grouping.
- fix: replace with `<>...</>` where no DOM node is needed, or add `role='none'` where one is.
- examples: https://github.com/dxos/dxos/pull/10251#discussion_r2585340352, https://github.com/dxos/dxos/pull/10075#discussion_r2463022146

## 24. own-context-for-deferred-effect-callbacks: Effect's own context is the single context-propagation mechanism; a deferred callback owns its context rather than inheriting the caller's

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: one-mechanism-per-concern · existing: none · confidence: high
- principle: Don't maintain two parallel context-propagation mechanisms (a custom `Context` object alongside Effect's own) once Effect is adopted — use Effect's context exclusively; and a deferred callback like an alarm/timer handler should not inherit the calling fiber's context, since that lets contexts grow unbounded through recursive scheduling chains — give it a context owned by its own scheduler.
- flag: a custom `Context`-like parameter threaded alongside Effect's own context; a forked/scheduled callback that silently inherits the parent fiber's context instead of a fresh one.
- do not flag: context genuinely meant to propagate forward within the same logical request/fiber.
- fix: pass the value through Effect's own context; fork the deferred callback with its own owned context.
- examples: https://github.com/dxos/dxos/pull/13008#discussion_r3968926579, https://github.com/dxos/dxos/pull/12883#discussion_r3915358423

## 25. prefer-effect-fn-fnUntraced: Use Effect.fn/Effect.fnUntraced to define Effect-returning functions, not a hand-wrapped Effect.gen

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: functions-before-classes (1 of 2 comments only) · existing: `effect` skill (SKILL.md: "`Effect.fnUntraced` is the default wrapper") · confidence: high
- principle: Prefer `Effect.fn`/`Effect.fnUntraced` over manually wrapping `Effect.gen` in an arrow function; use `Effect.fnUntraced` (not `Effect.fn`) in tests where tracing adds no value, and give `Effect.fn` an explicit name whenever it is used.
- flag: `(args) => Effect.gen(function* () {...})` where `Effect.fn`/`fnUntraced` would do; an unnamed `Effect.fn(...)` call; `Effect.fn` used inside a test with no tracing need.
- do not flag: a genuine boundary worth a trace span, using named `Effect.fn`.
- fix: wrap with `Effect.fnUntraced`/named `Effect.fn` instead of hand-wrapping `Effect.gen`.
- examples: https://github.com/dxos/dxos/pull/9896#discussion_r2394509299, https://github.com/dxos/dxos/pull/10376#discussion_r2656839067

## 26. diff-scoped-to-stated-purpose: Keep a diff scoped to what the PR says it does; drop unrelated or accidental changes

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: none · existing: `submit-pr` skill / CLAUDE.md commit hygiene ("Commit nothing silently") · confidence: high
- principle: A pull request's diff must match its stated purpose — remove stray formatting, reordering from a bad merge, or any other change unrelated to what the PR description says it does.
- flag: a hunk that reformats or reorders code the PR's description gives no reason to touch; an edit with no connection to the stated change.
- do not flag: incidental changes the PR description explicitly calls out and justifies (e.g. a drive-by fix named in the description).
- fix: revert the unrelated hunk so the diff matches the PR description.
- examples: https://github.com/dxos/dxos/pull/10527#discussion_r2863781713, https://github.com/dxos/dxos/pull/10827#discussion_r2991855510

---

Single-PR exceptions kept for being unusually sharp and mechanically checkable (per the drop rule's carve-out):

## 27. moon-yml-entrypoint-registration: Every package.json export/import entrypoint must be registered in the package's moon.yml build config

- comments: 5 · PRs: 1 (10452) · authors: dmaretskyi · seed: none · existing: none · confidence: high
- principle: Adding an entrypoint to `package.json`'s `exports`/`imports` without also registering it in the package's `moon.yml` compile configuration means the build silently misses it.
- flag: a `package.json` `exports`/`imports` entry added or changed with no matching update to the same package's `moon.yml`.
- do not flag: an entrypoint that maps to an already-registered glob/pattern in `moon.yml`.
- fix: add the new path to `moon.yml`'s compile configuration.
- examples: https://github.com/dxos/dxos/pull/10452#discussion_r2725564421, https://github.com/dxos/dxos/pull/10452#discussion_r2725564586, https://github.com/dxos/dxos/pull/10452#discussion_r2725564650

## 28. parent-child-ref-must-be-backed: A parent-child relationship must be backed by an actual reference from the parent to the child, not a bare parent pointer

- comments: 2 · PRs: 1 (12675) · authors: wittjosiah · seed: none · existing: `org.dxos.review.echo#inline-obj-parent` (adjacent — that rule is about _when_ to set the parent pointer; this is about the parent side needing a matching ref, a distinct failure mode) · confidence: medium
- principle: Setting an object's parent pointer must be backed by an actual reference (or annotation) from the parent to the child; adding a child the parent holds no reference to leaves a dangling one-way edge.
- flag: code that sets a child's parent pointer with no corresponding ref/annotation added on the parent side.
- do not flag: a purely computed/derived parent-child edge that the codebase has decided not to back with a stored ref, stated as such.
- fix: add the ref or annotation on the parent alongside the parent-edge write, or enforce it as an invariant in the setter.
- examples: https://github.com/dxos/dxos/pull/12675#discussion_r3816670221, https://github.com/dxos/dxos/pull/12675#discussion_r3817558292

## Seed check

- `one-mechanism-per-concern`: 39 comments tagged with this seed across 30 distinct PRs in this slice, 50 comments across the eight clusters it underlies — by far the best-supported seed; keep as-is, it underlies clusters 1, 2, 6, 11, 17, 21, 22, 24 above.
- `state-owned-once`: 5 comments, 4 distinct PRs — real but thin; keep, and sharpen with the concrete instances here (derive an AST from its grammar source, subscribe to a query's own live results instead of mirroring into a signal, one designated id field per referenceable thing) rather than the abstract "no mirrored copies" phrasing alone.
- `no-impossible-state-handling`: 1 comment, 1 PR — too thin to confirm from this slice alone; the one hit (long hooks stacked with defensive non-null checks) is a plausible instance but not enough signal here to sharpen or drop on its own; check the other category slices before deciding.
- `functions-before-classes`: 1 comment, 1 PR — same as above, too thin in this slice; the one hit is really about `Effect.fn` vs hand-wrapped `Effect.gen`, a narrower Effect-specific case than the seed's general "stateless manager is a module" framing — consider whether the seed should be split into a general rule and an Effect-specific `Effect.fn` rule (cluster 25 above covers the latter with better support, 2 PRs, once the Effect skill's existing guidance is factored in).
- `dependency-direction`: 0 comments, 0 PRs — no support at all in this slice; check the other category slices (api-design, architecture) before concluding, since this rule is about layering, which this slice's testing/effect/react-ui/echo/process/other categories rarely touch directly.
- `handle-errors-at-one-level`: 0 comments, 0 PRs — no support in this slice either; same caveat as above, worth checking `errors` and `architecture` categories specifically since this slice excluded them.

## Dropped

- semantic-html-elements-over-divs: 1 comment, PR 9891
- keydown-not-keyup-handlers: 1 comment, PR 9891
- verify-shared-style-across-consumers: 1 comment, PR 9891
- conditional-visual-state-via-css-data-attributes: 1 comment, PR 9891
- compare-against-library-previous-state-snapshot: 1 comment, PR 9897
- tx-theme-function-not-direct-theme-import: 2 comments, PR 9961
- hook-dep-array-include-reactive-value: 1 comment, PR 9987
- useCallback-memoize-handler-props: 1 comment, PR 10242
- no-benefit-useMemo: 1 comment, PR 11393
- typed-not-found-error-not-void: 2 comments, PR 9896
- toolkit-declarative-builder-not-imperative: 1 comment, PR 10086
- shared-tracing-helper-not-manual-layers: 1 comment, PR 10150
- check-then-create-race-needs-semaphore: 1 comment, PR 10404
- bounded-concurrency-not-sequential-loop: 1 comment, PR 13193
- operation-declares-service-tag-not-resolved-instance: 1 comment, PR 11584
- wrap-only-specific-promise-call-narrowly: 2 comments, PR 12214
- wrap-setTimeout-in-effect-async: 1 comment, PR 12214
- obj-make-not-live-wrapper-for-db-objects: 1 comment, PR 9957
- audit-query-callsites-after-field-split: 1 comment, PR 9967
- schema-field-order-matches-ui-form-order: 1 comment, PR 10242
- ref-resolver-scope-to-holder-space: 1 comment, PR 10613
- dxn-ref-only-for-serialization-boundary: 2 comments, PR 10614
- follow-established-pattern-for-similar-type: 1 comment, PR 10600
- label-annotation-for-display-string: 1 comment, PR 10897
- queryable-data-as-own-object-type: 1 comment, PR 12090
- normalize-composite-value-into-columns: 1 comment, PR 13284
- test-timeout-sized-to-actual-cost: 1 comment, PR 9915
- test-each-for-parameterized-cases: 1 comment, PR 9918
- console-log-vs-structured-logger-in-tests: 1 comment, PR 10209
- fix-lifecycle-not-reinit-workaround: 1 comment, PR 10536
- phrase-test-prompts-naturally: 1 comment, PR 10983
- deterministic-fixture-ids-not-redaction: 1 comment, PR 10913
- test-proves-id-refactor-preserves-info: 1 comment, PR 10913
- no-trivial-test-setup-helpers-hiding-api: 1 comment, PR 12792 (already covered by `org.dxos.review.code-style#no-trivial-wrappers-over-official-apis`)
- no-exact-boundary-value-assertions: 1 comment, PR 12849
- scorer-data-fetching-in-test-body: 1 comment, PR 13048
- menu-contribution-not-adhoc-click-handler: 1 comment, PR 10649
- factor-ui-region-into-own-component: 1 comment, PR 10695
- surface-mechanism-not-direct-embed: 2 comments, PR 11072
- i18n-runtime-string-not-hardcoded-literal: 1 comment, PR 10178
- copyright-header-credits-actual-author: 6 comments, PR 12644 (already covered by CLAUDE.md Non-negotiables — copyright notices)
