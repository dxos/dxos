# Live feed objects + subscription triggers — DESIGN

PR **#12235** (branch `t3code/edb619e9`). Makes feed-backed ECHO objects "live"
(reactive, mutable via `Obj.update`, identity-stable), unifies them with
automerge-backed objects, and gives subscription triggers real mutation
semantics over both the space database and feeds.

## Goals

- Feed-backed objects behave like automerge-backed objects: synchronous
  optimistic mutation via `Obj.update`, reactive (`Obj.subscribe`/atoms/
  `useObject`), stable identity across queries/appends/ref-resolution,
  snapshot-able, with async background persistence. **No opt-out** — feed
  objects are uniformly live (a non-live fallback would be a sharp API edge).
- `db.add(obj, { to: feed })` as a sync alternative to `db.appendToFeed`,
  confirmed by `db.flush()`.
- Subscription triggers report a real mutation type (`created`/`updated`/
  `deleted`) and work over feed-scoped queries, not just the space database.

## Key design decisions

- **Whole-object re-append = update.** Persisting an `Obj.update` re-appends the
  whole object reusing its id; the index collapses entries by id to the latest
  block. No protocol change. Out of scope (deferred, TODO'd in code):
  partial-object update blocks, field-level LWW merge, compaction/retention of
  superseded blocks.
- **`FeedObjectCore` reconciliation** (`echo-client/src/feed/feed-object-core.ts`):
  single latest-state field (`#state`) + a version baseline keyed on
  `KEY_QUEUE_POSITION` (`insertionId` is not client-exposed). Not a list of
  outstanding writes. Cross-tab/cross-process concurrent writes are
  **last-flush-wins at whole-object granularity** (documented data-loss mode).
- **Live materialization is pulled out of `objectFromJSON`.** The feed handle
  calls `makeDecodedEntityLive(await objectFromJSON(...))`; `objectFromJSON` has
  no `live` option (per review).
- **Subscription change detection is content-signature based**, not
  `Obj.version` — feed objects are unversioned (no automerge heads). A canonical
  sorted-key JSON signature (`objectSignature`) covers both sources uniformly.
- **Feed deletes surface via queryable tombstones**, not an id-set diff. A
  `Feed.remove` appends a bodyless `{ id, '@deleted': true }` block; the index
  now merges that partial block onto the prior snapshot (`FtsIndex.update`) and
  preserves the prior type/kind/relation/parent columns (`EntityMetaIndex.update`),
  so a `deleted: 'include'` query returns the deleted object with type+body
  intact and it hydrates as deleted (`Obj.isDeleted === true`). The dispatcher
  detects deletes uniformly via `deleted: 'include'` + `Obj.isDeleted` for both
  db and feed sources.
- **No spec-level mutation-type filter.** `FeedSpec.ignoreUpdates` was removed
  ("keep triggers light"). To fire only on newly-added feed objects, gate on
  `event.type === 'created'` in the runnable. `SubscriptionSpec.options` is only
  `deep`/`delay` (currently unused by the local dispatcher). Possible follow-up:
  a `mutationTypes?` option checked before `fire(...)`.

## Constraints / gotchas discovered

- The repo's d.ts pipeline strips **all `_`-prefixed members** (not just
  `@internal`) from published declarations, so a `_`-prefixed method is not
  callable cross-package at `:build` time. `evictFeedHandle` (test-support
  cache eviction) is therefore a public (non-underscore) method.
- The `Database.add` Effect-namespace wrapper intentionally omits the method's
  `opts` — it is applied point-free (`Effect.forEach(Database.add)`), where a
  second param collides with the iteratee index. `{ to }` lives on the method.
- Package moves on main during this work: `functions-runtime` → `compute-runtime`;
  `compute/src/Trigger.ts` → `compute/src/types/Trigger.ts`.

## Source map

- Live materialization: `echo/src/internal/common/proxy/make-object.ts`
  (`makeDecodedEntityLive`), `typed-handler.ts`, `Obj/json-serializer.ts`.
- Feed client: `echo-client/src/feed/{feed-object-core,feed-handle}.ts`,
  `client/index-query-source-provider.ts`, `proxy-db/database.ts`.
- Indexing (tombstone merge): `index-core/src/indexes/{fts-index,entity-meta-index}.ts`.
- Triggers: `compute/src/types/{Trigger,TriggerEvent}.ts`,
  `compute-runtime/src/triggers/trigger-dispatcher.ts`.
- Changesets: `.changeset/{feed-live-objects,subscription-trigger-mutation-types,feed-tombstone-body-preserved}.md`.
