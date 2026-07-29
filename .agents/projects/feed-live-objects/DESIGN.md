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

## Roadmap

Revised 2026-07-29 after the chat/scale exploration (event-sourcing comparison
vs LiveStore; Discord-scale partial-replication analysis; open-chat/Matrix
survey). Decisions feeding this ordering: **first-party channels ship on feeds**
(Bluesky-DM strategy — small and native first); **external large-scale sources
enter as processed signals via connectors**, not replicated feeds; **Matrix is a
long-term investigation**, not a dependency. Phases are sequenced by product
pull — email drives scale-out and first-party channels inherit it — rather than
by event-sourcing semantics. Dependency chain 1 → 2 → 3 → 4, one PR each; 5 and
6 are demand-gated.

1. **Version/order axis (correctness).** Wire `insertionId` through the codec +
   index path so live objects stop leaning on `KEY_QUEUE_POSITION` (null unless
   `assignQueuePositions` is on — flagged by Dmytro and CodeRabbit). The client
   must always hold a total provisional order (`position`, else Lamport
   `(sequence, actorId)`, else `insertionId`) before server positions arrive;
   document the reorder-on-position-arrival semantics.
2. **Consumer cursors, read state, and push.** Implement the stubbed
   `Feed.cursor`/`Feed.next` (Effect streams) on the phase-1 axis. A durable
   high-water cursor per consumer serves three uses: trigger-dispatcher dedup
   (replaces the unbounded `processedVersions` map), chat read receipts /
   unread counts (a member's read state is a cursor), and eventually replacing
   content-signature diffing. Add the `SubscriptionSpec.options.mutationTypes`
   filter, and graduate `FeedHandle` from 1s polling to the sync protocol's
   existing subscription mechanism pushed through EDGE — chat latency is the
   forcing function.
3. **Retention + epoch chaining.** Implement `Feed.setRetention`; compaction by
   rewriting a prefix into a snapshot block (self-contained state — unlike a
   pure event log); and the epoch-chaining convention: an unbounded logical
   stream (mailbox, channel) is a chain of per-era feeds with only the head
   feed live. Breaks the ~10k blocks/feed ceiling; prerequisite for phase 4.
4. **Sparse feeds: partial-history paging (email-scale).** The local block set
   becomes a set of position ranges — one durable replicated tail plus
   evictable cached ranges under an LRU budget. Remote range queries against
   non-replicated history (the `FeedQuery` protocol already carries
   `before`/`after`/position-range/`reverse`); domain-order paging bounded by a
   position watermark, with the live tail patching rendered pages (late
   arrivals, edits, tombstones). Driven by email archive browsing; first-party
   channels inherit device-exceeding scale for free.
5. **Delta blocks (demand-gated).** Partial-object update blocks + field-level
   LWW merge at the index; block vocabulary grows from {snapshot, tombstone} to
   {create, patch, delete}; per-object rollback/replay of the fold on position
   reorder. Deferred because chat and email tolerate whole-object re-append
   (small objects, rare edits). Constraint discovered in the partial-replication
   analysis: a patch block must never strand a partial replica without its base
   snapshot — deltas compose with sparse feeds only with a self-containedness
   rule at range/replication boundaries.
6. **App-defined projections (exploratory, demand-gated).** User-defined
   deterministic folds over a feed (typed event objects in, derived ECHO state
   out) with rematerialization keyed on a reducer/schema hash. Candidate
   consumers: trigger pipelines, inbox sync, audit views, composer-search's
   feed-synced index.

Cross-cutting (attach to whichever phase touches the code): an explicit policy
for schema-invalid feed items (today silently dropped at `log.verbose`) —
`warn`/`ignore`/`fail`/callback, per LiveStore's `unknownEventHandling`;
surfacing `getSyncState` (`blocksToPull`/`blocksToPush`) in devtools; and a
standing principle — product code consumes only the Feed API and the sync layer
keeps its injected-transport seam (`SyncClient` options `sendMessage`), so a
future external backend (Matrix bridge, connector-backed feeds) stays a backend
swap rather than a rewrite.

### Companion workstreams (referenced, not feed phases)

- **First-party chat.** Channels on feeds at current scale: edit/delete/react
  via live objects (#12235), notifications via subscription triggers, read
  state via phase 2, scale via phases 3–4. Needs one new primitive — an
  ephemeral presence/typing channel over EDGE messaging, explicitly not feed
  blocks. Becomes its own project when work starts.
- **Large-source ingestion** (e.g. whole Discord servers): source-cursor
  pipeline (the external cursor, e.g. last snowflake per channel, lives in a
  small ECHO object) emitting signals; add a capped-retention feed buffer only
  when multiple consumers or replay-within-a-window are needed.
- **Matrix / ATProto shelf.** Bridge-feed (`FeedBackend`) design, ATProto-OAuth
  → OIDC identity-broker sketch, and the open-chat survey are done and parked;
  revisit on demand.

## Source map

- Live materialization: `echo/src/internal/common/proxy/make-object.ts`
  (`makeDecodedEntityLive`), `typed-handler.ts`, `Obj/json-serializer.ts`.
- Feed client: `echo-client/src/feed/{feed-object-core,feed-handle}.ts`,
  `client/index-query-source-provider.ts`, `proxy-db/database.ts`.
- Indexing (tombstone merge): `index-core/src/indexes/{fts-index,entity-meta-index}.ts`.
- Triggers: `compute/src/types/{Trigger,TriggerEvent}.ts`,
  `compute-runtime/src/triggers/trigger-dispatcher.ts`.
- Changesets: `.changeset/{feed-live-objects,subscription-trigger-mutation-types,feed-tombstone-body-preserved}.md`.
