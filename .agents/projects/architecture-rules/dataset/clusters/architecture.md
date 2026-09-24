# Clusters: architecture, simplicity, errors, performance

Input: 348 principles across 158 PRs. Clusters: 26 (dropped 16 single-PR clusters; a further ~25 one-off comments never recurred at all and are not listed).

## 1. no-parallel-mechanism: reuse or extend an existing mechanism instead of building a second one

- comments: 85 · PRs: 62 · authors: dmaretskyi, mykola-vrmchk, richburdon, wittjosiah · seed: one-mechanism-per-concern · confidence: medium
- principle: Before writing a new service, adapter, registry, cache, helper, type, or query path, check whether one already covers the concern and extend or call that instead of adding a parallel one.
- flag: a new class/function/module that does roughly what an existing one in the same package or a sibling package already does — a second HTTP client for a protocol one client already speaks, a second config-building helper, a hand-rolled SQL string where the query builder has an `IN`-clause helper, a bespoke registry next to the framework's own lifecycle/cleanup mechanism.
- do not flag: a genuinely new capability with no existing analogue, or an existing mechanism that is a poor fit on its merits (wrong data shape, wrong lifecycle) — the comment should name the concrete gap, not just assert novelty is bad.
- fix: delete or don't write the new implementation; import and call the existing one, adding a parameter if it needs to vary.
- examples: https://github.com/dxos/dxos/pull/10271#discussion_r2597932864, https://github.com/dxos/dxos/pull/10376#discussion_r2656842061, https://github.com/dxos/dxos/pull/10423#discussion_r2703222276, https://github.com/dxos/dxos/pull/13288#discussion_r4069275854, https://github.com/dxos/dxos/pull/9862#discussion_r2390740510

## 2. delete-dead-code-after-migration: remove the old path when a replacement lands, don't leave both

- comments: 22 · PRs: 21 · authors: dmaretskyi, mykola-vrmchk, wittjosiah · seed: one-mechanism-per-concern · confidence: medium
- principle: When a migration, refactor, or replacement supersedes a mechanism, delete the superseded file/type/re-export/flag in the same change instead of leaving it stubbed, unused, or as a compatibility shim.
- flag: a duplicate file left behind after logic moved elsewhere, a re-export shim at an old import path after call sites moved, an unused config escape hatch nothing exercises, a deprecated function still called, service requirements a refactor no longer needs.
- do not flag: a deprecation window explicitly requested for external/downstream consumers (rare in this codebase per the no-shim convention already in CLAUDE.md) — the exception needs to be stated, not assumed.
- fix: delete the stale file/branch/re-export and point every remaining caller at the new location in the same PR.
- examples: https://github.com/dxos/dxos/pull/11796#discussion_r3421630793, https://github.com/dxos/dxos/pull/11884#discussion_r3441902661, https://github.com/dxos/dxos/pull/12647#discussion_r3802706634, https://github.com/dxos/dxos/pull/13074#discussion_r3995846258, https://github.com/dxos/dxos/pull/9896#discussion_r2394537111

## 3. dependency-direction: lower/foundational packages must not import from higher-level or UI-specific ones

- comments: 23 · PRs: 20 · authors: dmaretskyi, richburdon, wittjosiah · seed: dependency-direction · confidence: medium
- principle: A package depends on the lowest-level package that provides what it needs; a foundational, shared, or protocol package never imports a higher-level, UI-specific, or app-specific package or concept to reuse a type or convenience.
- flag: `@dxos/app-framework` or a common/shared module importing a UI library; a protocol/plan/schema package carrying executor logic or a UI-only annotation; an app-specific helper (e.g. a login page) living in a shared SDK package; a core/compute package importing a UI package merely for a type.
- do not flag: a `import type`-only cross-import between peer API modules — reviewers explicitly called out that type-only imports don't create the circular-dependency problem value imports do, so this is not a violation.
- fix: move the lower-level piece into (or reimplement it in) the low-level package, or move the higher-level piece out of it into the consuming layer.
- examples: https://github.com/dxos/dxos/pull/10251#discussion_r2585348813, https://github.com/dxos/dxos/pull/10661#discussion_r2879059111, https://github.com/dxos/dxos/pull/10725#discussion_r2926796665, https://github.com/dxos/dxos/pull/11165#discussion_r3169392826, https://github.com/dxos/dxos/pull/13328#discussion_r4079893401

## 4. state-owned-once: no mirrored copies, side-tables, or duplicate fields for the same state

- comments: 24 · PRs: 18 · authors: dmaretskyi, wittjosiah · seed: state-owned-once · confidence: medium
- principle: Track a piece of state in exactly one place — on the record that owns it — instead of a parallel map/side-table/duplicate field kept in sync by hand; derive rather than denormalize.
- flag: a `WeakMap`/side-table keyed by entity id for data that could live on the entity itself, two fields that serve the same purpose after a rename/migration, a value reconstructed from parts when the producer could just pass (or the API already derives) the whole thing, an append-only update log where only the latest state is ever read.
- do not flag: a genuine index/cache whose whole job is to be a different-shaped lookup over data still owned elsewhere (this is not duplication, it's a derived read path) — see `avoid-full-scan` below for when that's actually wanted.
- fix: move the tracked field onto the owning object/record, delete the side-table, and add an eviction/cleanup path if the side-table was serving that role.
- examples: https://github.com/dxos/dxos/pull/10913#discussion_r3248967158, https://github.com/dxos/dxos/pull/11796#discussion_r3421624608, https://github.com/dxos/dxos/pull/12256#discussion_r3608161758, https://github.com/dxos/dxos/pull/12235#discussion_r3608182348, https://github.com/dxos/dxos/pull/13288#discussion_r4079320007

## 5. no-pointless-indirection: don't wrap, name, or generalize a value that doesn't need it

- comments: 20 · PRs: 17 · authors: dmaretskyi, richburdon, thure, wittjosiah · seed: none (adjacent to functions-before-classes) · confidence: medium
- principle: Don't introduce an intermediate variable, wrapper function, explicit generic argument, or cache for something that's already trivial, used once, or inferrable — write the direct thing.
- flag: a className wrapped in a class-merging helper with nothing to merge, an explicit `<T>` on a call TypeScript already infers, a single-use helper only called from one site, a memoization cache in front of a computation that's already cheap, a shell command wrapped in a script with no added behavior.
- do not flag: an extraction that names a genuinely reused or semantically meaningful chunk, even if short — the rule is about no added value, not about line count.
- fix: inline the value/call at its one use site, or drop the wrapper/cache/explicit type argument.
- examples: https://github.com/dxos/dxos/pull/13070#discussion_r4002304345, https://github.com/dxos/dxos/pull/13081#discussion_r4003590650, https://github.com/dxos/dxos/pull/9891#discussion_r2383460040, https://github.com/dxos/dxos/pull/9897#discussion_r2411549144, https://github.com/dxos/dxos/pull/10242#discussion_r2577062426

## 6. no-impossible-state-handling: fail hard on states the types already exclude, don't paper over them

- comments: 15 · PRs: 13 · authors: dmaretskyi, mykola-vrmchk, richburdon, wittjosiah · seed: no-impossible-state-handling · confidence: high
- principle: When a value's absence would already fail an earlier assertion, or a context is required for correctness, use `invariant`/throw instead of a defensive fallback, optional chaining, or a silently degraded no-op; model kind-varying data as a tagged union instead of a struct with fields that are only meaningful for some kinds.
- flag: `?? ''`/`??=`/`!` after a preceding assertion already guarantees presence, an optional React context field guarded with `?.` everywhere instead of being required, a struct with fields that only apply to some of its variants, a branch silently dropped during a refactor without justification.
- do not flag: a field that is optional because the case is a deliberate, documented progressive-enhancement path, not because the author wasn't sure — state that explicitly.
- fix: add/rely on the `invariant` and delete the fallback branch, or make the field required and check it once at the boundary.
- examples: https://github.com/dxos/dxos/pull/9979#discussion_r2421106448, https://github.com/dxos/dxos/pull/10380#discussion_r2674403246, https://github.com/dxos/dxos/pull/10434#discussion_r2711069185, https://github.com/dxos/dxos/pull/11054#discussion_r3119808216, https://github.com/dxos/dxos/pull/12143#discussion_r3552655074

## 7. canonical-api-surface: import the canonical public export, not an internal or legacy duplicate

- comments: 22 · PRs: 11 · authors: dmaretskyi, richburdon, wittjosiah · seed: dependency-direction / one-mechanism-per-concern · confidence: medium
- principle: A package's public modules should be self-sufficient and its exports hidden behind a clear `internal/` boundary; application code imports the canonical public type/export, never an internal path or a legacy duplicate the public one has superseded.
- flag: `import` reaching into another package's `internal/` or `src/...` path when a public export exists, a public API type still deriving from a legacy internal-types module, a local re-export of something the source package already exports directly.
- do not flag: code inside the same package's own `internal/` tree importing its own internals — the rule is about crossing the package boundary.
- fix: switch the import to the public entry point (adding the missing export there if needed), and delete the internal-reaching import or local re-export.
- examples: https://github.com/dxos/dxos/pull/10230#discussion_r2555502347, https://github.com/dxos/dxos/pull/10233#discussion_r2559512879, https://github.com/dxos/dxos/pull/10527#discussion_r2773711313, https://github.com/dxos/dxos/pull/11721#discussion_r3373560705, https://github.com/dxos/dxos/pull/12575#discussion_r3781174417

## 8. business-logic-out-of-ui: keep sync/integration logic in operations, not container components

- comments: 11 · PRs: 11 · authors: dmaretskyi, richburdon, wittjosiah · seed: dependency-direction / one-mechanism-per-concern · confidence: medium
- principle: Business/integration logic (API calls, sync, data mapping) belongs in an Operation or service, independent of UI; a React container component should call it, not reimplement it, and a surface/wiring file should stay thin.
- flag: fetch/sync/API-client code written inside a `.tsx` container or inside `Surface.create` wiring, the same sync logic implemented once in a component and again in an operation, an AI/model call made with its own credentials instead of through the shared AiService/operation.
- do not flag: UI-only state (open/closed, selection, form-local validation) living in the component — that's not business logic.
- fix: move the logic into an Operation/service module and have the component invoke it; move component-specific hooks out of the surface-wiring file into the container.
- examples: https://github.com/dxos/dxos/pull/11018#discussion_r3103360527, https://github.com/dxos/dxos/pull/11018#discussion_r3103373931, https://github.com/dxos/dxos/pull/11025#discussion_r3112893359, https://github.com/dxos/dxos/pull/11084#discussion_r3133565124, https://github.com/dxos/dxos/pull/13100#discussion_r4026018522

## 9. inject-dependencies-via-constructor: accept shared deps once, not per-method or via a global registry

- comments: 9 · PRs: 8 · authors: dmaretskyi, wittjosiah · seed: functions-before-classes / one-mechanism-per-concern · confidence: medium
- principle: When a module needs several collaborators (a host, an indexer, a query engine), take them once through a constructor and store them as fields, rather than threading them as a parameter through every method or reaching into a global mutable registry.
- flag: the same dependency passed as an argument to every method of a class, a module of loose functions closing over an ad hoc context object, per-object bookkeeping kept in a global `Map` instead of on the object.
- do not flag: a genuinely stateless pure function that takes its inputs as parameters — that's not a missing constructor, it's correctly not a class.
- fix: convert the function module into a class (or object) whose constructor takes the dependencies, and reference the stored fields from its methods.
- examples: https://github.com/dxos/dxos/pull/12412#discussion_r3774411485, https://github.com/dxos/dxos/pull/13272#discussion_r4061678702, https://github.com/dxos/dxos/pull/10913#discussion_r3250928112, https://github.com/dxos/dxos/pull/11383#discussion_r3273965818, https://github.com/dxos/dxos/pull/12951#discussion_r3943275888

## 10. functions-before-classes: give behavior a home matching its actual state and lifecycle

- comments: 5 · PRs: 4 · authors: dmaretskyi, richburdon · seed: functions-before-classes · confidence: medium
- principle: A stateful builder with no real lifecycle should be a plain function; conversely, a function that operates on a class's own state should be a method on that class, not a free function reaching in from outside.
- flag: a chainable builder class used only to assemble test data with no lifecycle; a free function taking an object's internals via an exported symbol when it could be a `#private`-backed method; Effect-based code wrapped in a plain class mixing in Promise glue instead of using Effect's own composition.
- do not flag: a class that does have real open/close lifecycle and internal state to protect — that's exactly what classes are for here.
- fix: replace the lifecycle-less class with a function, or move the free function onto the class it operates on as a method with private state.
- examples: https://github.com/dxos/dxos/pull/10897#discussion_r3030840251, https://github.com/dxos/dxos/pull/11974#discussion_r3485913988, https://github.com/dxos/dxos/pull/12529#discussion_r3746537262, https://github.com/dxos/dxos/pull/13261#discussion_r4061733869

## 11. fix-root-cause-not-symptom: don't swallow, retry-around, or paper over an unexplained failure

- comments: 5 · PRs: 4 · authors: dmaretskyi, mykola-vrmchk, wittjosiah · seed: none · confidence: medium
- principle: When something fails unexpectedly, diagnose and fix the actual precondition violation, race, or misconfiguration — don't catch-and-swallow at the call site, add another client-side mitigation for an issue already diagnosed and fixed upstream, or ship a fix without a known root cause.
- flag: a `catch` that silently discards an error to work around a race instead of fixing the race; a new client-side retry/guard layered on an issue whose upstream fix is already known and pending; a fix PR description that says "this should help" without identifying the cause.
- do not flag: a genuine, documented defensive boundary at a system edge (e.g. a network call) — the rule targets internal invariant violations being masked, not all error handling.
- fix: remove the workaround, add diagnostics/logging to capture the real cause if it isn't known yet, and fix the precondition or wait for the upstream fix.
- examples: https://github.com/dxos/dxos/pull/11332#discussion_r3241126618, https://github.com/dxos/dxos/pull/12235#discussion_r3614647750, https://github.com/dxos/dxos/pull/12515#discussion_r3750701514, https://github.com/dxos/dxos/pull/13013#discussion_r3989465117

## 12. error-messages-carry-context: include the identifier, value, or code that lets a failure be traced

- comments: 4 · PRs: 4 · authors: dmaretskyi, richburdon · seed: none · confidence: medium
- principle: An error thrown for an unexpected or unsupported case should carry the specific id/value encountered and a structured code where one exists, not a generic static message, and should be a typed/domain error rather than a raw `Error`.
- flag: `throw new Error('not found')` with no id interpolated, a switch's default branch throwing a message that doesn't include the unexpected value, matching failure kinds on a free-form message string instead of a structured code.
- do not flag: a message that already interpolates the relevant value — the point is presence of context, not phrasing.
- fix: interpolate the id/value into the message, add an error-code field to the event/error and match on that, and extract the construction into a small factory if reused.
- examples: https://github.com/dxos/dxos/pull/10323#discussion_r2628434855, https://github.com/dxos/dxos/pull/10434#discussion_r2711071074, https://github.com/dxos/dxos/pull/11308#discussion_r3247600185, https://github.com/dxos/dxos/pull/12473#discussion_r3733221748

## 13. lifecycle-owned-by-its-resource: create/register cleanup once, in the layer that owns the resource

- comments: 4 · PRs: 4 · authors: dmaretskyi · seed: state-owned-once · confidence: medium
- principle: A resource-scoped job, subscription, or interval should be created once as a class-scoped field and opened/closed through that resource's own lifecycle hooks (or the framework's cleanup mechanism), not created ad hoc and left running, and runtime-specific behavior belongs in the layer that owns that runtime, not a shared orchestrator.
- flag: a `setInterval`/subscription started inline with no destructor registered anywhere; a shared host/orchestrator class carrying a constant or delay that only applies to one specific runtime; all open/close steps centralized in one orchestrator instead of each component owning its own.
- do not flag: an orchestrator that legitimately sequences several components' own open/close calls — that's coordination, not owning their lifecycle logic.
- fix: hoist the resource's construction into a class field and drive it from open/close, registering cleanup through the framework's lifecycle/contribution API; move runtime-specific constants down into the runtime-specific module.
- examples: https://github.com/dxos/dxos/pull/10539#discussion_r2781711821, https://github.com/dxos/dxos/pull/11027#discussion_r3112786364, https://github.com/dxos/dxos/pull/12147#discussion_r3553870412, https://github.com/dxos/dxos/pull/12585#discussion_r3782459571

## 14. no-premature-abstraction: don't add a helper, facade, or shorthand before it's earned its keep

- comments: 4 · PRs: 4 · authors: dmaretskyi, richburdon · seed: none · confidence: high
- principle: Don't add a convenience wrapper, façade, or public API surface for a pattern that hasn't recurred enough to justify it, and don't reintroduce an abstraction (like dispatch through a mutable handler slot) that was deliberately removed for simplicity.
- flag: a new helper/shorthand added speculatively "for later," a façade/adapter that hides a distinction (e.g. local vs. remote execution) the caller actually needs to branch on correctly, machinery re-added that a prior PR removed on purpose.
- do not flag: an abstraction backed by two or more real call sites today — that has earned itself.
- fix: remove the speculative API/facade and let callers see the real distinction, or wait until a second concrete caller justifies it.
- examples: https://github.com/dxos/dxos/pull/10636#discussion_r2863706286, https://github.com/dxos/dxos/pull/10649#discussion_r2875415371, https://github.com/dxos/dxos/pull/12765#discussion_r3925969149, https://github.com/dxos/dxos/pull/12951#discussion_r3947043279

## 15. never-cast-to-silence-the-type-checker: fix the type mismatch, don't cast past it

- comments: 12 · PRs: 3 · authors: dmaretskyi, wittjosiah · seed: none (matches the repo's own non-negotiable) · confidence: high
- principle: `as any`, a bare `as T`, or a non-null `!` used to make a type error go away hides a real mismatch; convert the data at the layer that owns the representation mismatch instead.
- flag: any cast whose purpose is "the types don't line up" rather than a narrowing the compiler genuinely can't prove; a `tryParse(...)!` where the throwing/direct variant would do; an unneeded generic parameter kept only so a cast can discard it.
- do not flag: `as const`, which this codebase's own non-negotiables explicitly allow.
- fix: implement the explicit conversion at the owning layer (the module producing or consuming the mismatched shape) and delete the cast.
- examples: https://github.com/dxos/dxos/pull/10527#discussion_r2788888150, https://github.com/dxos/dxos/pull/10527#discussion_r2792771149, https://github.com/dxos/dxos/pull/10543#discussion_r2783003326, https://github.com/dxos/dxos/pull/10242#discussion_r2577080326

## 16. dont-recompute-in-reactive-closures: construct expensive resources once, outside the recomputation

- comments: 9 · PRs: 3 · authors: dmaretskyi · seed: one-mechanism-per-concern / state-owned-once · confidence: medium
- principle: Inside a reactive/atom recomputation, don't recreate an expensive resource (a query, a `WeakRef` deref) on every run; construct or dereference it once outside the closure so its lifetime matches the surrounding scope, and cache derived-by-identity values in the shared utility rather than per call site.
- flag: `Atom.make`/similar recomputation closures that call a constructor or `.deref()` on every invocation instead of once; callers each adding their own `useMemo` around a pure derivation a shared utility should cache itself.
- do not flag: work that genuinely must re-run because its inputs changed — the rule is about work independent of the closure's inputs being redone anyway.
- fix: hoist the construction/deref outside the closure, and add cache/eviction (WeakMap, FinalizationRegistry) to the shared utility instead of caller-side memoization.
- examples: https://github.com/dxos/dxos/pull/10450#discussion_r2719274285, https://github.com/dxos/dxos/pull/10450#discussion_r2719288037, https://github.com/dxos/dxos/pull/10419#discussion_r2706686505, https://github.com/dxos/dxos/pull/12235#discussion_r3608185606

## 17. structured-logging-not-console: use the project logger, at the right level, without spamming

- comments: 4 · PRs: 3 · authors: mykola-vrmchk, richburdon, wittjosiah · seed: one-mechanism-per-concern · confidence: medium
- principle: Use `@dxos/log`'s structured logger, never `console.log`, mix only one logging API per module, and log routine/frequent events below `info` so a loop or callback doesn't spam the stream.
- flag: `console.log`/`console.*` left in committed code, a log call inside a loop/callback with no throttle at `info` or above, a file mixing `console` calls and `log` calls.
- do not flag: a genuinely rare, meaningful state transition logged at `info` — the rule targets volume and the wrong API, not logging itself.
- fix: replace `console.*` with `log`, and drop frequent/internal-detail log calls to `debug`/`trace` or gate them.
- examples: https://github.com/dxos/dxos/pull/10176#discussion_r2541840597, https://github.com/dxos/dxos/pull/10272#discussion_r2610584802, https://github.com/dxos/dxos/pull/10291#discussion_r2611982637

## 18. use-context-scoped-cancellation: cooperate with the codebase's Context primitive, don't hand-roll timers

- comments: 3 · PRs: 3 · authors: dmaretskyi, wittjosiah · seed: none · confidence: medium
- principle: Schedule timeouts through the context-aware scheduling helper (not a raw `setTimeout`) so they're cancelled automatically on disposal; a caller waiting on a scheduled task must still await its actual completion rather than returning early on context disposal; and don't wrap a call in an external cancellation helper when the callee already accepts and handles a context itself.
- flag: a raw `setTimeout`/`setInterval` with no tie to the owning context's disposal; a caller that returns as soon as context is disposed while the underlying task keeps running (orphaned work, unhandled rejection risk); a redundant cancellation wrapper around a call that's already context-aware.
- do not flag: a one-shot timer explicitly scoped to process lifetime, not a request/operation context.
- fix: use the ctx-scoped scheduler helper, keep awaiting completion instead of racing disposal, and remove the redundant wrapper.
- examples: https://github.com/dxos/dxos/pull/11332#discussion_r3241046285, https://github.com/dxos/dxos/pull/12777#discussion_r3871730724, https://github.com/dxos/dxos/pull/13013#discussion_r3971638207

## 19. avoid-full-collection-scans: use the index or incremental path, not a scan of everything

- comments: 3 · PRs: 3 · authors: dmaretskyi · seed: none · confidence: medium
- principle: Don't scan an entire space/collection or a data structure's full history when a targeted, indexed query or a cheap incremental check can answer the same question.
- flag: a "find all objects referencing X" implemented as iterate-every-object-in-the-space instead of a reverse-reference index lookup; a value recomputed by scanning from the beginning of history on every check instead of from the latest heads.
- do not flag: a one-time migration or admin tool where a full scan is the explicit, acceptable cost.
- fix: replace the scan with the indexed/targeted query, or compute incrementally from the latest state.
- examples: https://github.com/dxos/dxos/pull/12412#discussion_r3895355760, https://github.com/dxos/dxos/pull/11735#discussion_r3380788544, https://github.com/dxos/dxos/pull/12725#discussion_r3842233816

## 20. scope-multi-tenant-queries-by-space: every query and index in a multi-space system carries a space id

- comments: 3 · PRs: 2 · authors: dmaretskyi · seed: state-owned-once · confidence: medium
- principle: A query or index over multi-tenant (multi-space) data must be scoped by space id, and that id must be the leading column of any composite key meant to be unique or queried within a scope, to avoid leaking or colliding across spaces.
- flag: a query type/SQL statement with no `spaceId` filter over data that spans spaces; a composite index/key whose scope id isn't the leading column.
- do not flag: genuinely space-agnostic system tables (e.g. account-level metadata) — the rule applies to per-space data specifically.
- fix: add the spaceId parameter/filter (joined against the owning table if needed) and put the scope id first in the composite key.
- examples: https://github.com/dxos/dxos/pull/10388#discussion_r2681040954, https://github.com/dxos/dxos/pull/12984#discussion_r3950001964

## 21. construct-populated-dont-mutate-after: build an object with its data, don't create-empty-then-fill

- comments: 2 · PRs: 2 · authors: dmaretskyi, wittjosiah · seed: none · confidence: medium
- principle: Pass initial data into the constructing call (or combined create-and-insert helper) rather than creating an empty object and mutating it with a follow-up call.
- flag: `Obj.make()` (or similar) followed immediately by field assignment or a separate insert call, when a combined form exists.
- do not flag: a builder pattern used for genuinely conditional/incremental construction where the fields aren't all known up front.
- fix: pass the initial values directly into the factory/insert call.
- examples: https://github.com/dxos/dxos/pull/9979#discussion_r2421095325, https://github.com/dxos/dxos/pull/10719#discussion_r2923815271

## 22. refactor-must-preserve-behavior: a mechanical rename or restructure must not silently change behavior

- comments: 2 · PRs: 2 · authors: wittjosiah · seed: no-impossible-state-handling · confidence: medium
- principle: A refactor that changes an identifier, representation, or branching structure must preserve prior behavior — including the negative/else case — as a side effect of the change, not drop it silently.
- flag: a branch rewritten during a refactor where the else-case handling disappears with no explanation; a naming/format change under which a prior eager-loading (or similar) behavior stops working.
- do not flag: a deliberate behavior change called out in the PR description as part of the refactor's intent.
- fix: restore the dropped branch/behavior, or explicitly justify in the PR why it's no longer needed.
- examples: https://github.com/dxos/dxos/pull/10421#discussion_r2704439286, https://github.com/dxos/dxos/pull/10913#discussion_r3251084574

## 23. batch-queries-not-n-plus-1: one round trip for a batch, not one per item

- comments: 2 · PRs: 2 · authors: dmaretskyi, mykola-vrmchk · seed: none · confidence: high
- principle: Accept an array/batch parameter and issue a single query (e.g. an `IN` clause, or an upsert) instead of one query per item in a loop or two round trips where one would do.
- flag: `Promise.all(ids.map(id => query(id)))` where a single batched query is possible; a check-then-write pattern issuing two round trips for what an upsert could do in one.
- do not flag: items that genuinely need independent transactions/error isolation.
- fix: change the method to accept an array and run one query (or upsert) covering all of them.
- examples: https://github.com/dxos/dxos/pull/10461#discussion_r2730285831, https://github.com/dxos/dxos/pull/13272#discussion_r4061663607

## 24. namespace-export-with-internal-hiding: structure a package as namespace modules with a hidden internal/

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: none · confidence: medium
- principle: Structure a package's exports as capitalized namespace modules re-exported via `export * as Foo` from `index.ts`, hide implementation under `internal/`, and keep a barrel/index re-exporting only from within its own subtree, never reaching up into parent directories.
- flag: a package's `index.ts` doing a blanket wildcard re-export of every submodule instead of an explicit public surface; a barrel file importing from `../` outside its own tree.
- do not flag: n/a — this is a structural convention already documented in the code-style skill.
- fix: move internal-only code under `internal/`, replace wildcard re-exports with explicit ones, and fix any upward barrel imports.
- examples: https://github.com/dxos/dxos/pull/11729#discussion_r3379156940, https://github.com/dxos/dxos/pull/10725#discussion_r2930798276

## 25. follow-existing-lazy-loading-pattern: match the sibling entries' lazy-load convention exactly

- comments: 2 · PRs: 2 · authors: wittjosiah · seed: none · confidence: high
- principle: When adding an entry to an existing lazily-loaded registry or module list, wrap it the same way the sibling entries are wrapped (e.g. `Capability.lazy`) instead of importing it eagerly.
- flag: a new capability/module added to a registry with a plain top-level `import` while every existing entry in that list uses a lazy wrapper.
- do not flag: a registry that has no established lazy convention yet.
- fix: wrap the new export in the same lazy-loader factory the existing entries use.
- examples: https://github.com/dxos/dxos/pull/11458#discussion_r3314201845, https://github.com/dxos/dxos/pull/11641#discussion_r3334040640

## 26. collapse-branches-via-identity-element: use the type's empty/identity value instead of parallel branches

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: none · confidence: medium
- principle: When several conditional branches each return a variant of the same composition, collapse them into one expression using the type's identity/empty element (e.g. `Layer.empty`) instead of branching.
- flag: `if/else` chains where each branch differs only in which piece is included in an otherwise-identical composition (a merge, a layer combination).
- do not flag: branches whose bodies genuinely differ beyond the identity substitution.
- fix: replace the branches with a single expression using a ternary/ fallback to the identity element.
- examples: https://github.com/dxos/dxos/pull/12147#discussion_r3553810864, https://github.com/dxos/dxos/pull/12193#discussion_r3574218258

## Seed check

- one-mechanism-per-concern: 99 comments, 60 PRs. Keep — by far the best-supported seed, but it's carrying at least four distinguishable sub-rules in practice (no-parallel-mechanism, delete-dead-code-after-migration, canonical-api-surface, business-logic-out-of-ui); consider shipping those as separate rules with sharper flag/do-not-flag boundaries rather than one broad rule, since "reuse X" reads very differently for a service than for an import path.
- state-owned-once: 24 comments, 17 PRs. Keep as written — the mined data matches the seed's own framing closely (mirrored state, single owner, derive don't duplicate).
- dependency-direction: 22 comments, 20 PRs. Keep — very strong, near-uniform "lower must not import higher" pattern across unrelated packages; the one nuance worth adding to the rule text is the explicit carve-out reviewers state themselves: type-only cross-imports between peer API modules are fine.
- no-impossible-state-handling: 10 comments, 9 PRs. Keep — solid support, and the data adds a second flag shape beyond "remove the defensive fallback": model kind-varying data as a tagged union so the impossible states can't be constructed in the first place.
- functions-before-classes: 7 comments, 6 PRs. Sharpen — the mined comments actually pull in two directions (stateful builder → plain function, AND free function → class method for state the class already owns), which the current one-line seed doesn't distinguish; split it into "no lifecycle-less builder classes" and "state-mutating helpers belong on the class that owns the state."
- handle-errors-at-one-level: 0 comments, 0 PRs. Drop from the seed list, or re-scope it — it did not recur once as a distinct rule-worthy comment in this 348-line architecture/simplicity/errors/performance slice; the closest supported pattern is the new fix-root-cause-not-symptom cluster (5 comments/4 PRs), which is about not swallowing errors at all rather than about which layer handles them.

## Dropped

- single-stream-not-getter-subscribe — 3 comments — PR 12185
- colocate-related-type-definitions — 2 comments — PR 10230
- prefer-build-tool-builtin-feature — 2 comments — PR 11212
- sql-migration-plain-preferred — 2 comments — PR 12615
- dont-modify-code-slated-for-deletion — 2 comments — PR 10527
- no-module-load-side-effects — 2 comments — PR 11458
- caught-error-must-be-visible-not-just-logged — 1 comment — PR 11235
- avoid-hand-rolled-promise-chain-ordering — 1 comment — PR 13204
- no-implicit-work-in-read-path — 1 comment — PR 13272
- prefer-simplest-primitive-over-abstraction — 1 comment — PR 12088
- dont-modify-files-beyond-refactor-scope — 1 comment — PR 11458
- cheap-fast-path-check-before-full-validation — 1 comment — PR 10913
- new-store-gets-its-own-module — 1 comment — PR 13272
- keep-runtime-config-consistent-across-targets — 1 comment — PR 12369
- workspace-star-dependency — 1 comment — PR 10696
- no-test-only-constructor-seams — 1 comment — PR 12743
