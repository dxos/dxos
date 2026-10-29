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
long-term investigation**, not a dependency.

**Re-staged 2026-08-04 (jdw)** around the query-shaped model: **the feed is the
replication method, not an order consumers see** — email and chat alike display
in domain order (`created`), never feed order — and deep history is served by
backend-computed queries, so the client never cursors through the remote feed
_for query traversal_ (range-map bookkeeping, the `patchUp` contract, and range
hydration are all dropped: a backend query already answers latest-per-id from
its own index). Stage-4 consumer cursors are a different thing — delivery
watermarks into the replicated tail, not remote traversal.
Primary focus is scaling feeds: stages 1 → 2 are the critical path and strictly
ordered (nothing may be evicted locally until the backend can answer for it);
stages 3–4 are the chat enablers (write correctness, then unread); everything
else waits on an explicit pull trigger, not a schedule.

1. **Backend-computed queries (remote queries).** The backend executes full
   queries — paging, filters, and aggregates (the mailbox thread aggregate:
   `group threadId` / `count` / `max created` / `items`, `MailboxArticle.tsx`)
   — over its complete copy of the feed. The client routes queries reaching
   beyond local history to the backend; results hydrate through the existing
   `FeedObjectCore` identity map, so they are ordinary live objects and tail
   replication patches them in place (edits, tombstones) with no extra
   machinery. Pagination rides the backend's existing opaque cursor
   (`feed-store.ts` already pages by `token|insertionId`). Additive — no
   replication change, no data-loss surface; ships while replicas are still
   full. Gate: mailbox browses/aggregates beyond what is local.
2. **Partial replication (bounded tail) + the local/remote query seam.** With
   stage 1 in place, bound the replica: a replication floor (sync pulls a tail
   window rather than from position 0 — today `sync-client.ts` pulls
   everything), local eviction of pre-floor blocks (building on
   `FeedStore.deleteOldestBlocks`), local-index semantics over partial history
   (latest-per-id stays sound — any recently-touched object's head is in the
   tail; anything wholly behind the floor is "not local → ask the backend"),
   and an LRU cache for backend results. The one genuinely new design item is
   the **seam**: a query spanning tail + deep history splits at a watermark so
   the boundary neither double-counts nor drops, and the local side sees
   not-yet-synced writes. The watermark alone does not resolve the same object
   appearing on both sides (an unsynced local edit of an object whose head
   lies behind the watermark; a tail tombstone for a backend-served result) —
   seam responses are therefore **versioned**, merged latest-per-id across the
   boundary for filters, aggregates, item lists, and pagination alike, with
   local unconfirmed writes winning until they roundtrip. Cached backend
   results record the watermark they were computed at and are revalidated (or
   served explicitly stale-marked) after later tail arrivals or local writes —
   never silently reused. Folded in: expose a monotonic server version on
   blocks/results reaching the client — the seam needs it, and it fixes the
   clean-state rollback mode in `reconcile` for near-free. Offline trade,
   accepted: deep history degrades to the tail + a marked-stale result cache.
3. **Multi-writer lost-update protection (write versioning).** The remaining
   `reconcile` failure mode: while an append is pending, a genuinely newer
   concurrent remote write to the same object is ignored (silent lost update)
   because without versions the order test answers "can't tell" and prefers
   local. Scope is **per-object write ordering, not display order** — with
   domain-order display everywhere (email and chat), the old version-axis
   ideas of a feed-wide provisional total order and
   reorder-on-position-arrival semantics are dropped; latest-per-id never
   depended on them. Needed: compare the stage-2 server version for same-id
   blocks in `reconcile`, plus a per-object tiebreaker for concurrent offline
   writers (Lamport `(sequence, actorId)`). The winner comparator is **one
   shared definition applied on every read path** — index collapse, seam
   merge, and `reconcile` — so a live object never disagrees with a fresh
   query or a reload. Gate for first-party chat writes —
   message edits and reactions are multi-writer mutations of a single object.
   Today's production feeds are effectively single-writer connectors, which is
   why this can follow the scale stages rather than precede them. (Original
   flag: Dmytro asked for `insertionId` exposure; CodeRabbit flagged the
   default-off `KEY_QUEUE_POSITION` guarantee.)
4. **Consumer cursors, read state, EDGE push — motivated by chat unread.**
   Chat does NOT depend on feed order for display (domain order, like email);
   what it needs is (a) read state — unread requires a monotonic _delivery_
   watermark ("seen through here"), and server position is the right axis
   because client timestamps skew (a timestamp cursor would mark never-seen
   late arrivals as read); (b) push latency — replace `FeedHandle`'s 1s
   polling with the sync protocol's subscription mechanism through EDGE;
   (c) dispatcher dedup hygiene — the unbounded `processedVersions` map.
   Implement the stubbed `Feed.cursor`/`Feed.next` and the `mutationTypes`
   filter on `SubscriptionSpec.options`. Constraints: cursor semantics are
   position arithmetic, never local-block presence (eviction-proof under
   stage 2); do not design out per-`threadId` keyed sub-cursors (per-thread
   unread).

Deferred — each behind an explicit pull trigger:

- **Retention + epoch chaining (total-feed truncation)** — trigger: the
  _total_ feed's growth becomes an EDGE storage/replication problem
  (superseded-block accumulation from whole-object re-append; the ~10k
  blocks/feed ceiling). `Feed.setRetention`; compaction by rewriting a prefix
  into a snapshot block (self-contained state — unlike a pure event log); the
  epoch-chaining convention (logical stream = chain of per-era feeds, only
  the head live). Interaction rule: a tombstone must not be compacted away
  while any replica could still hold the live object.
- **Delta blocks** — trigger: write amplification (large/hot objects where
  whole-object re-append hurts). Partial-object update blocks + field-level
  LWW merge at the index; block vocabulary grows from {snapshot, tombstone}
  to {create, patch, delete}. A patch block must never strand a partial
  replica without its base snapshot (self-containedness at replication
  boundaries).
- **App-defined projections** — exploratory, demand-gated. User-defined
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
  via live objects (#12235), notifications via subscription triggers, write
  correctness via stage 3, read state via the deferred cursors item, scale via
  stages 1–2. Needs one new primitive — an ephemeral presence/typing channel
  over EDGE messaging, explicitly not feed blocks. Becomes its own project
  when work starts.
- **Large-source ingestion** (e.g. whole Discord servers): source-cursor
  pipeline (the external cursor, e.g. last snowflake per channel, lives in a
  small ECHO object) emitting signals; add a capped-retention feed buffer only
  when multiple consumers or replay-within-a-window are needed.
- **Pluggable feed backend (`FeedBackend`).** Promote the implicit sync seam —
  `SyncClient`'s injected `sendMessage`, with the server role played by whoever
  answers `QueryRequest`/`AppendRequest` — to an explicit backend interface
  (`query`/`append`/`subscribe`), so the stage 1–2 read-through machinery can
  pair the Feed API with a non-EDGE backend (Matrix, IMAP, Discord) unchanged.
  Per-backend adapter obligations live here, not in the feed stages: mapping
  external ordering onto monotonic versions, send idempotency across outbox
  retries (block identity → external message id), and serving deep queries
  (paging, filters, aggregates where the backend can) from the external API.
  Out of scope for this project — stages 1–2's only obligation is to define
  query/seam/watermark semantics against the interface rather than against
  EDGE specifics, keeping the seam clean.
- **Matrix shelf.** The open-chat survey and Matrix integration analysis are
  done and parked (an ATProto-OAuth → OIDC identity-broker sketch rides along
  parenthetically). Matrix is a strong candidate for a `FeedBackend` consumer
  and likely the long-term production chat backend — though the first
  consumer could equally be freeq or another backend. Revisit on demand.

## Source map

- Live materialization: `echo/src/internal/common/proxy/make-object.ts`
  (`makeDecodedEntityLive`), `typed-handler.ts`, `Obj/json-serializer.ts`.
- Feed client: `echo-client/src/feed/{feed-object-core,feed-handle}.ts`,
  `client/index-query-source-provider.ts`, `proxy-db/database.ts`.
- Indexing (tombstone merge): `index-core/src/indexes/{fts-index,entity-meta-index}.ts`.
- Triggers: `compute/src/types/{Trigger,TriggerEvent}.ts`,
  `compute-runtime/src/triggers/trigger-dispatcher.ts`.
- Changesets: `.changeset/{feed-live-objects,subscription-trigger-mutation-types,feed-tombstone-body-preserved}.md`.
