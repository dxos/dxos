# Subscription trigger mutation types, `subject` coverage, and feed-sourced queries

Status: IMPLEMENTED
Owner: (assign)
Branch: `t3code/edb619e9`
Related area: `@dxos/compute` (types) + `@dxos/functions-runtime` (dispatcher)

## Implementation notes (deviations from the plan)

- **Change detection is content-signature based, not `Obj.version`.** The spike confirmed feed-backed
  live objects are _unversioned_ (no automerge heads), so version comparison never sees a feed
  re-append as an update. The dispatcher now compares a canonical JSON signature (`objectSignature`),
  which covers both the database and feed sources uniformly. `processedVersions` now stores that
  signature instead of an encoded version.
- **Feed deletes use the id-set diff** (spike outcome): `Feed.remove` leaves no queryable tombstone
  (`deleted: 'include'` returns nothing for a removed feed item), so feed-scoped deletes are detected
  by diffing previously-seen ids against the current live set. The database source still uses
  `deleted: 'include'` + `Obj.isDeleted` for a precise tombstone signal; a database object merely
  falling out of the filter predicate is intentionally NOT reported as deleted.

## Goal

Extend the subscription-trigger contract so that:

1. The `SubscriptionEvent.type` field reports a real mutation kind — `'created' | 'updated' | 'deleted'` — instead of the placeholder `'unknown'`.
2. The `subject` ref on `SubscriptionEvent` is exercised and asserted (dereferences to the changed object; behaves correctly on delete).
3. Subscription queries can be sourced from a **feed** (queue), not just the space database, so subscription semantics apply to feed items.

Plus: a **test matrix** for the trigger dispatcher covering (1)–(3) across the relevant conditions, including mutations that happen _in a feed_.

## Current state (as of this branch)

- Spec: `packages/core/compute/compute/src/Trigger.ts` — `SubscriptionSpec` = `{ kind: 'subscription', query: { raw?, ast }, options?: { deep?, delay? } }`. `deep`/`delay` are **not read** by the dispatcher.
- Event: `packages/core/compute/compute/src/TriggerEvent.ts` — `SubscriptionEvent = { type: Schema.String, subject: Ref<Obj.Unknown>, changedObjectId?: string (deprecated) }`.
- Dispatcher: `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts`, `case 'subscription'` (~L663–726).
  - Runs `Database.query(Query.fromAst(spec.query.ast))`.
  - Loads per-trigger `TriggerState.processedVersions` (id → encoded `Obj.version`).
  - For each object: fires if no recorded version OR `Obj.compareVersions(current, existing) === 'different'`.
  - Always emits `{ type: 'unknown', subject: db.makeRef(Obj.getURI(object)), changedObjectId: object.id }`.
  - Records new version; saves state if any changed.
- State store: `packages/core/compute/functions-runtime/src/triggers/trigger-state-store.ts` — `TriggerState` tagged `'subscription'` with `processedVersions: Record<EntityId, string>`.
- Input templating: `packages/core/compute/functions-runtime/src/triggers/input-builder.ts` — `{{event.*}}` / `{{trigger.*}}` substitution; payload defaults to the raw event when no `input`.
- Tests: `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.test.ts` — `describe('Database Triggers (Subscription)')` (~L664–857). Existing “pass correct event data” test asserts `changeType: 'unknown'` with a `// TODO` note; a `should not invoke triggers for unchanged objects` test is currently `it.effect.skip`.

### Relevant ECHO primitives confirmed

- Feed queries lower to DB queries with a feed scope: `Feed.query(feed, filter)` === `Database.query(query.from(Scope.feed(feedUri)))` (`packages/core/echo/echo/src/Feed.ts` L207–221). So a subscription `query.ast` can already target a feed if built with `.from(Scope.feed(...))`.
- Deletion is observable: `Query.options({ deleted: 'include' | 'exclude' | 'only' })` (`Query.test.ts` L370) and `Obj.isDeleted(obj)` (`packages/core/echo/echo/src/Obj.ts` L668). Default excludes deleted objects.
- Feed item updates re-append the whole object under the same id (`Feed.ts` L71–74), so `Obj.version` changes are detectable; `Feed.remove` removes items.

## Design

### 1. Mutation `type` — `'created' | 'updated' | 'deleted'`

**Schema change** (`TriggerEvent.ts`):

```ts
export const SubscriptionMutationType = Schema.Literal('created', 'updated', 'deleted');
export type SubscriptionMutationType = Schema.Schema.Type<typeof SubscriptionMutationType>;

export const SubscriptionEvent = Schema.Struct({
  type: SubscriptionMutationType,
  subject: Ref.Ref(Obj.Unknown),
  /** @deprecated Use `subject`. */
  changedObjectId: Schema.optional(Schema.String),
});
```

Remove the `// TODO(dmaretskyi): Specify enum.` comment.

**Dispatcher change** (`case 'subscription'`): classify per object.

- `created`: id NOT in `processedVersions`.
- `updated`: id IN `processedVersions` AND `compareVersions !== 'same'`.
- `deleted`: id IN `processedVersions` AND the object is now deleted / no longer present.

Deletion detection approach (chosen): run the query with `deleted: 'include'` so tombstoned objects still surface, then branch on `Obj.isDeleted(object)`:

- Build the effective query as `Query.fromAst(spec.query.ast)` and force `.options({ deleted: 'include' })` (merge, don't clobber other options).
- For each returned object:
  - If `Obj.isDeleted(object)`:
    - If id in `processedVersions` and not already recorded as deleted → emit `deleted`, then delete the key from `processedVersions` (so re-creation later is a fresh `created`). Use a version compare to avoid re-emitting on repeated polls (record a sentinel, or simply drop the key after emitting — dropping is simplest and correct because a subsequent poll won't find the id and won't re-emit).
    - If id not in `processedVersions` → ignore (never saw it alive; nothing to report).
  - Else (live):
    - Not in `processedVersions` → `created`.
    - In `processedVersions` and version different → `updated`.
    - Same version → skip.

Rationale for `deleted: 'include'` over a diff of the id-set: a diff can’t distinguish a true delete from an object that merely stopped matching the filter (e.g. a property changed so it fell out of the predicate). `deleted: 'include'` + `Obj.isDeleted` gives a precise delete signal. (Objects that fall out of the filter without deletion are intentionally NOT reported — matches “subscription over a query” semantics: only membership+version transitions we can see.)

**Open decision (flag for review before coding):** whether “fell out of filter predicate” should also emit `deleted`. Default in this plan: NO (only real tombstones). If product wants “left the result set” semantics, we’d need to diff `processedVersions` keys against the current live-match id-set as an additional path.

Emit shape:

```ts
event: {
  type,                       // 'created' | 'updated' | 'deleted'
  subject: db.makeRef(Obj.getURI(object)),
  changedObjectId: object.id, // retained for back-compat
} satisfies TriggerEvent.SubscriptionEvent,
```

### 2. `subject` coverage

No production change strictly required (already emitted), but:

- Ensure `subject` is a resolvable `Ref` for `created`/`updated` (dereferences to the object).
- For `deleted`, `subject` still carries the URI; resolving may yield `undefined` (deleted objects resolve to `undefined` per `Ref` atoms). Tests must assert on `subject.dxn`/URI identity rather than a resolved value for the delete case.
- Add explicit test assertions dereferencing `event.subject` and comparing identity to the mutated object (see matrix).

### 3. Feed-sourced subscription queries

Two sub-parts:

**a. Spec ergonomics** — add a helper to build a feed-scoped subscription spec, mirroring `specSubscription`:

```ts
// Trigger.ts
export const specSubscriptionFromFeed = (
  feed: Feed.Feed,
  filter: Filter.Any = Filter.everything(),
  options?: { deep?: boolean; delay?: number },
): SubscriptionSpec => ({
  kind: 'subscription',
  query: { ast: Query.select(filter).from(Scope.feed(/* feedUri */)).ast },
  options,
});
```

Note: `Scope.feed` needs the feed URI (`Feed.getFeedUri(feed)`), which requires the feed to be persisted. Confirm import surface (`Scope`, `Filter` from `@dxos/echo`). If building the URI at spec-construction time is awkward, alternative is to store the feed ref on the spec and resolve at dispatch — but prefer encoding the scope in the AST to keep the dispatcher source-agnostic.

**b. Dispatcher** — should require **no special-casing** if the scope is in the AST, because `Query.fromAst(ast)` already resolves the feed scope through `Database.query`. Verify:

- `deleted: 'include'` option composes with a feed scope (feed `Feed.remove` → does the item surface as `isDeleted`? or does it simply disappear?). **This is the key runtime risk to validate.** If feed removal does NOT produce a tombstone visible to the query, delete-in-feed detection needs the id-set diff fallback for feed-scoped queries. Validate with a spike test before finalizing the delete path.
- Version tracking (`processedVersions`) is keyed by object id, which is stable across feed re-append, so `updated` detection should work.

## Files to change

| File                                                                              | Change                                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/core/compute/compute/src/TriggerEvent.ts`                               | `SubscriptionMutationType` literal; retype `SubscriptionEvent.type`.                |
| `packages/core/compute/compute/src/Trigger.ts`                                    | Add `specSubscriptionFromFeed` (+ exports).                                         |
| `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts`      | Classify mutation type; `deleted: 'include'`; drop key on delete; emit typed event. |
| `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.test.ts` | Test matrix (below).                                                                |
| (maybe) `packages/core/compute/compute/src/index.ts` barrel                       | Export new symbol if needed.                                                        |

## Test matrix

Add under `describe('Database Triggers (Subscription)')` (and a sibling `describe('Feed-sourced Subscription')`). Use existing `TestLayer()` (manual time control), `Reply` op, `Person`/`Task` types, `Feed`.

Dimensions:

- **Source**: `database` (space) | `feed` (queue).
- **Mutation**: `created` | `updated` | `deleted`.
- **Assertion focus**: fires exactly once; `event.type` correct; `event.subject` resolves to (or identifies) the right object; `changedObjectId` matches.

| #   | Source                  | Mutation                | Setup → Action                                                                     | Expect                                                                                                                                                            |
| --- | ----------------------- | ----------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | database                | created                 | add trigger, refresh, `Database.add(person)`                                       | 1 result, `type==='created'`, `subject` resolves to person, `changedObjectId===person.id`                                                                         |
| 2   | database                | updated                 | add person, add trigger, first dispatch (consumes `created`), `Obj.update` + flush | next dispatch: 1 result, `type==='updated'`, subject resolves, same id                                                                                            |
| 3   | database                | deleted                 | add person, add trigger, first dispatch, `Obj.delete(person)` + flush              | next dispatch: 1 result, `type==='deleted'`, `changedObjectId===person.id`, `subject` URI matches (resolved value may be undefined)                               |
| 4   | database                | no-op                   | after processing, dispatch again with no changes                                   | 0 results (un-skip the existing skipped test)                                                                                                                     |
| 5   | database                | created→deleted→created | delete then re-add same-typed object                                               | fresh `created` after re-add (key was dropped on delete)                                                                                                          |
| 6   | feed                    | created                 | feed-scoped trigger, `Feed.append(feed, [person])`                                 | 1 result, `type==='created'`, subject/id correct                                                                                                                  |
| 7   | feed                    | updated                 | append, dispatch, `Obj.update(item)` + `Database.flush`                            | 1 result, `type==='updated'`                                                                                                                                      |
| 8   | feed                    | deleted                 | append, dispatch, `Feed.remove(feed, [item])`                                      | 1 result, `type==='deleted'` — **gated on the feed-tombstone spike (see risks); if feed removal is invisible, implement id-set diff fallback and keep this test** |
| 9   | feed                    | filtered                | feed-scoped trigger with `Filter.type(Task)`; append a `Person` then a `Task`      | only the `Task` fires                                                                                                                                             |
| 10  | subject (cross-cutting) | created+updated         | reuse #1/#2                                                                        | dereference `event.subject` (via `Database.load`/`Ref` resolve) and assert identity equals the mutated object                                                     |

Notes:

- Prefer a small table-driven helper to reduce duplication, but keep each `it.effect` independently readable (per testing conventions).
- Assert on `results.length` AND `Exit.isSuccess(result)` AND the templated output (extend the existing input-template test to assert `changeType` now equals the real mutation kind, removing the `TODO`).
- For `subject` resolution use the dispatcher’s space db (`Database.load(event.subject)` inside the op, or resolve in-test) and compare `.id`.

## Sequencing (small, reviewable steps)

1. **Spike** (throwaway test): verify feed `deleted: 'include'` / `Feed.remove` visibility. Decide delete-detection strategy for feed source. (Blocks #8 and the feed delete branch.)
2. Schema: retype `SubscriptionEvent.type` + `SubscriptionMutationType`. Build `@dxos/compute`.
3. Dispatcher: created/updated classification (no delete yet). Update input-template test expectation (`unknown` → `created`). Un-skip test #4.
4. Dispatcher: delete detection (`deleted: 'include'` + `Obj.isDeleted`, drop key). Tests #3, #5.
5. Spec helper `specSubscriptionFromFeed` + feed-source tests #6, #7, #9.
6. Feed delete (#8) per spike outcome.
7. `subject` assertions (#10) + full matrix pass.
8. Changeset (`@dxos/compute` + `@dxos/functions-runtime`) — consumer-relevant event-shape change (`type` is now a narrowed literal; downstream consumers reading `event.type` may need updates). Grep consumers of `SubscriptionEvent.type` / `changeType` before finalizing.

## Verification

- `moon run functions-runtime:test -- src/triggers/trigger-dispatcher.test.ts`
- `moon run compute:build && moon run functions-runtime:build`
- `moon run :lint -- --fix` and `pnpm format`
- Grep for consumers of `SubscriptionEvent`/`changedObjectId`/`changeType` to catch breakage from the `type` narrowing.

## Risks / open questions

- **Feed deletion visibility** (biggest unknown) — does a feed-scoped query surface removed items as `isDeleted`? Spike first (step 1).
- **Type narrowing is a breaking change** for anything switching on `event.type` string values other than the three literals. Audit + changeset.
- **`deep`/`delay` options** remain unimplemented; out of scope here (note only).
- **First-poll-of-pre-existing-objects** are reported as `created` (first time the trigger sees them), even if they predate the trigger. Confirm this is the desired semantic (current behavior already fires for them).
- **Delete key-drop vs. sentinel** — dropping the `processedVersions` key on delete is simplest and makes re-creation a fresh `created`; ensure no duplicate `deleted` emission across polls (dropping guarantees this).
