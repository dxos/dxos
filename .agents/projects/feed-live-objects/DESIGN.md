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

## Roadmap (post-#12235)

Informed by an architectural comparison of ECHO feeds against event-sourcing
systems (LiveStore in particular). The feed substrate is already event-log-grade
— server-assigned total order, idempotent replication, partial/tail replication —
but the semantic layers above it are missing, and several of this project's
documented workarounds (content-signature change detection, the unbounded
`processedVersions` map, last-flush-wins data loss) are downstream symptoms of
those gaps. Phases are ordered so each fixes a debt of this project and unlocks
the next: 1 → 2 → 3 → 4 land independently as their own PRs; 5 is exploratory.

1. **Version/order axis (correctness).** Wire `insertionId` through the codec +
   index path so live objects stop leaning on `KEY_QUEUE_POSITION` (null unless
   `assignQueuePositions` is on — flagged by Dmytro and CodeRabbit). The client
   must always hold a total provisional order (`position`, else Lamport
   `(sequence, actorId)`, else `insertionId`) before server positions arrive;
   document the reorder-on-position-arrival semantics.
2. **Consumer cursors + subscription discipline.** Implement the stubbed
   `Feed.cursor`/`Feed.next` (Effect streams) on the phase-1 axis. Rebase the
   trigger dispatcher onto a durable high-water cursor per subscription —
   replacing `processedVersions` and, eventually, content-signature diffing —
   and add the `SubscriptionSpec.options.mutationTypes` filter at the same seam.
   Pull-from-cursor is also the seam that lets `FeedHandle`'s 1s polling give
   way to the sync protocol's existing subscription mechanism.
3. **Delta blocks: give blocks intent.** Partial-object update blocks +
   field-level LWW merge at the index. The block vocabulary grows from
   {snapshot, tombstone} to {create, patch, delete}, with the index as the
   built-in deterministic materializer folding in log order. Shrinks the
   last-flush-wins data-loss mode to field granularity. Position arrival now
   changes merge results (not just sort order), so this phase needs a per-object
   rollback/replay of the fold — cheap, since folds are per-object.
4. **Retention + compaction.** Implement `Feed.setRetention` and compaction of
   superseded blocks. Feeds can compact by rewriting a prefix into a snapshot
   block (self-contained state — unlike a pure event log). Addresses the ~10k
   blocks/feed ceiling, which phase 3's patch blocks make more pressing.
5. **App-defined projections (exploratory, demand-gated).** User-defined
   deterministic folds over a feed (typed event objects in, derived ECHO state
   out) with rematerialization keyed on a reducer/schema hash. Candidate
   consumers: trigger pipelines, inbox sync, audit views, composer-search's
   feed-synced index.

Cross-cutting (attach to whichever phase touches the code): an explicit policy
for schema-invalid feed items (today silently dropped at `log.verbose`) —
`warn`/`ignore`/`fail`/callback, per LiveStore's `unknownEventHandling`; and
surfacing `getSyncState` (`blocksToPull`/`blocksToPush`) in devtools.

## Source map

- Live materialization: `echo/src/internal/common/proxy/make-object.ts`
  (`makeDecodedEntityLive`), `typed-handler.ts`, `Obj/json-serializer.ts`.
- Feed client: `echo-client/src/feed/{feed-object-core,feed-handle}.ts`,
  `client/index-query-source-provider.ts`, `proxy-db/database.ts`.
- Indexing (tombstone merge): `index-core/src/indexes/{fts-index,entity-meta-index}.ts`.
- Triggers: `compute/src/types/{Trigger,TriggerEvent}.ts`,
  `compute-runtime/src/triggers/trigger-dispatcher.ts`.
- Changesets: `.changeset/{feed-live-objects,subscription-trigger-mutation-types,feed-tombstone-body-preserved}.md`.
