# Live feed objects + subscription triggers — TASKS

_Resume: start stage 1 — backend-computed queries (paging/filters/aggregates
over the full feed; results hydrate via the identity map). Uncommitted: none.
Last: roadmap re-staged 2026-08-04 around the query-shaped model; no stage
code exists yet._

PR **#12235** (branch `t3code/edb619e9`). See DESIGN.md for architecture.

## Status

**All three PRs merged**: #12235 (implementation, `7b270f2e`), #12368 and #12391
(roadmap docs). Remaining work is the staged roadmap below (see DESIGN.md
"Roadmap"), each stage its own PR.

**No stage code exists** — verified at `fcdd424a`: `insertionId` appears only in
`feed/src/feed-store.ts` (server-side block identity / query cursors) and is
absent from `echo-protocol`/`echo-db`; `feed-object-core.ts` derives its version
baseline from `KEY_QUEUE_POSITION` via `positionOf` (null by default). Relevant
to stages 2–3 (server-version exposure, write versioning).

## Done

- [x] Live feed objects: `makeDecodedEntityLive`, typed-handler support,
      schemaless fallback stays a plain snapshot.
- [x] `FeedObjectCore` single-state + version-baseline reconciliation;
      `FeedHandle` rework around `#cores`; query-path hydration + flush.
- [x] `db.add(obj, { to: feed })` sync append, confirmed by `db.flush()`.
- [x] Always-live index-query fallback (no non-live sharp edge).
- [x] Subscription triggers: `SubscriptionMutationType` (created/updated/
      deleted), content-signature detection, `subject` ref on the event.
- [x] Feed tombstone visibility fixed upstream (FtsIndex + EntityMetaIndex
      partial-block merge); dropped the id-set diff; uniform
      `deleted: 'include'` + `Obj.isDeleted`.
- [x] Removed `FeedSpec.ignoreUpdates` / `specSubscriptionFromFeed`;
      `getFeedUri` jsdoc'd as on-track-for-removal; O(n) `processedVersions`
      comment for the edge dispatcher.
- [x] Changesets: feed-live-objects, subscription-trigger-mutation-types,
      feed-tombstone-body-preserved.
- [x] Merge integration fixes: `evictFeedHandle` made public (d.ts `_`-strip);
      `Database.add` namespace wrapper drops `opts` (point-free compatibility).
- [x] Regenerated `assistant-toolkit` agent skill memoized cache after merges.

## Verification

- CI green on `fb5cd015` (all six jobs). Codecov: all modified lines covered.
- Local at `b5e19d5e`: `echo-client` 509 (+7 expected fail), `echo-client-e2e` 282,
  `echo` 469, `compute-runtime` 152, `compute` 46, `index-core` 34, `feed` 19 —
  all passing. Lint 0 warnings, `oxfmt` clean.
- `moon run :lint :build --affected` cannot complete in the agent sandbox: oxlint
  fails to spawn `tsgolint` in the unrelated `lockfile-explorer` package, which
  aborts the run before reaching our packages. Environmental — CI's `check` runs
  the same oxlint 1.74 / tsgolint 0.25 and passes. Lint our packages explicitly.

## Next / open

- [x] Check workflow green (done at `fb5cd015`).
- [x] Out of draft (`5f720c70`) — this also unblocked CodeRabbit, which refused to
      re-review while drafted.
- [x] Addressed the CodeRabbit review (`b5e19d5e`); its threads are marked
      "Addressed in commits 113db73 to b5e19d5".
- [x] Verdicts on both durability claims (below).
- [x] Land: merged to `main` as `7b270f2e`.

## Durability claims — verdicts (`b5e19d5e`)

Both were **real**, traced against the code rather than taken on the bot's word.

- **`dispose()` dropped a same-tick update — FIXED.** It reached
  `#dirtyCores.clear()` before the scheduled append ran, so `Obj.update` followed
  by a close or `evictFeedHandle` lost the write. `dispose()` now drains via
  `waitForPendingWrites()` first, while the scheduler and service are still live.
  Proven by regression test `disposing the feed handle flushes a same-tick update
instead of dropping it` — with the fix reverted it fails on
  `expected 'john' to deeply equal 'john v2'`. Changeset:
  `feed-dispose-flushes-pending` (`@dxos/echo` patch).
- **`flush()` can return with a retry queued — ACKNOWLEDGED, contract unchanged
  (jdw).** `waitForPendingWrites` stays best-effort, matching the pre-existing
  append contract, with a `TODO(wittjosiah)` on the method. The obvious drain-loop
  fix needs a bounded retry policy first: unbounded draining would hang on a
  permanently failing send, and throwing on the first failed attempt would break
  the existing `append retries after a failed insertIntoFeed RPC` test, which
  requires flush to tolerate a failure that later succeeds.

Because the flush contract stayed non-throwing, the dispose drain cannot reject —
so persisting on teardown can never wedge close.

## Notes on the no-cast pass (`8608c791`)

- `FeedHandle` now validates rather than asserts: `EntityId.make` where an id
  must be well-formed, `EntityId.isValid` narrowing in `delete`, and no cast in
  `upsertFromJSON` (the guard above already narrows `json.id`).
- `EntityId.make` _throws_ on a malformed id where the old cast silently stored a
  bad `#cores` key. Intentional — the inbound poll path already drops ids failing
  `EntityId.isValid` — but it is a behaviour change on the append path.
- `getCachedObjectById`'s `as T` is retained: it is exactly what
  `DatabaseImpl.getObjectById` does in the same package, and diverging for one
  method is worse than matching precedent.

## Scope: core-only, no consumer integration

Every changed file is under `packages/core/`; nothing in `packages/plugins/` or
`packages/apps/`. The additive surfaces ship with no callers — `db.add(obj, { to })`
has none outside core tests, and `SubscriptionEvent.type` is written by the
dispatcher and read by nobody (no runnable gates on `type === 'created'`, the
documented replacement for `ignoreUpdates`).

The part that is _not_ additive is the exposure: live feed objects are opt-out
free, so ~14 production feed call sites inherit the new semantics with no code
change, and direct assignment outside `Obj.update` now **throws** where it
previously mutated in memory silently.

- [x] Audited those call sites — **clean, risk accepted (jdw)**. Nothing was
      mutating feed objects before: in every production consumer `Scope.feed(...)`
      only scopes a _query_, and the feed-derived objects are read-only (rendered
      in lists/articles). The objects actually mutated — `view` in
      `ViewEditor`/`PipelineProperties`, `space.properties` in `feed-logger` — are
      space-db-backed and already had the throw-on-direct-assignment contract, and
      all of them go through `Obj.update` or `useObject`'s updater. So the
      opt-out-free change reaches no existing mutation path.

## Roadmap stages (see DESIGN.md "Roadmap"; re-staged 2026-08-04)

Primary focus: scaling feeds. The feed is the replication method, not an order
consumers see — display is domain-order everywhere (email and chat alike), and
deep history is served by backend-computed queries, so the client never
cursors the remote feed for query traversal (range-map / `patchUp` /
range-hydration dropped); stage-4 consumer cursors are delivery watermarks
into the replicated tail, not remote traversal. Stages 1 → 2 are the critical
path, strictly ordered; 3 gates chat writes; 4 serves chat unread; the rest is
pull-triggered, not scheduled.

### Stage 1 — backend-computed queries (NEXT)

Additive — no replication change, no data-loss surface; ships while replicas
are still full. Gate: mailbox browses/aggregates beyond local history.

- [ ] Backend query execution over the full feed: paging, filters, and
      aggregates (mailbox thread aggregate: `group threadId` / `count` /
      `max created` / `items`).
- [ ] Client routing: queries reaching beyond local history go to the
      backend; results hydrate through the `FeedObjectCore` identity map
      (live objects, patched in place by tail replication).
- [ ] Pagination via the backend's existing opaque `token|insertionId`
      cursor.
- [ ] Define against the `FeedBackend` interface shape, not EDGE specifics
      (companion workstream — keeps external backends a swap).

### Stage 2 — partial replication (bounded tail) + query seam

Depends on stage 1: nothing may be evicted locally until the backend can
answer for it.

- [ ] Replication floor: sync pulls a tail window rather than from position 0
      (today `sync-client.ts` pulls everything).
- [ ] Local eviction of pre-floor blocks (building on
      `FeedStore.deleteOldestBlocks`); LRU cache for backend results.
- [ ] Local-index semantics over partial history: latest-per-id sound because
      a recently-touched object's head is in the tail; wholly-behind-the-floor
      means "not local → ask the backend". Define ref-into-evicted-history
      behavior (deref goes remote).
- [ ] Local/remote query seam: a query spanning tail + deep history splits at
      a position watermark — no double-count or drop at the boundary; local
      side sees not-yet-synced writes.
- [ ] Seam merge semantics: responses are versioned and merged latest-per-id
      across the boundary (filters, aggregates, item lists, pagination);
      local unconfirmed writes win until they roundtrip. Tests: updates and
      tombstones on both sides of the watermark.
- [ ] Cache freshness: cached backend results record their watermark;
      revalidate (or serve explicitly stale-marked) after later tail arrivals
      and local writes — never silently reuse.
- [ ] Expose a monotonic server version on blocks/results reaching the client
      (seam bookkeeping; also fixes the clean-state rollback in `reconcile`).
- [ ] Document the offline trade: tail + marked-stale result cache; deep
      history is online-only (accepted).

### Stage 3 — multi-writer lost-update protection (write versioning)

Chat-writes gate: message edits and reactions are multi-writer mutations of a
single object. Scope is per-object write ordering, NOT display order — the old
version-axis ideas of a feed-wide provisional total order and
reorder-on-position-arrival are dropped (display is domain-order everywhere;
latest-per-id never depended on them). Deferrable behind stages 1–2 because
today's production feeds are effectively single-writer connectors.

- [ ] `reconcile` compares the stage-2 server version for same-id blocks —
      fixes the pending-append lost update (a genuinely newer concurrent
      remote write is currently ignored, "prefer local").
- [ ] Per-object tiebreaker for concurrent offline writers: Lamport
      `(sequence, actorId)`.
- [ ] One shared winner comparator across every read path — index collapse,
      seam merge, `reconcile` — with persistence + query-path coverage for
      the ordering tuple (a live object must never disagree with a fresh
      query or reload).
- [ ] Tests: cross-tab concurrent `Obj.update`; offline appends from two
      writers converge on sync.

### Stage 4 — consumer cursors, read state, push (motivated by chat unread)

Chat does NOT depend on feed order for display (domain order, like email);
this stage exists for read state, latency, and dedup hygiene.

- [ ] Durable per-consumer high-water cursor: a monotonic _delivery_
      watermark ("seen through here") on the server-position axis — client
      timestamps skew (a timestamp cursor would mark never-seen late arrivals
      as read). Decide storage home (consumer's own object vs feed metadata)
      and API (`Feed.getCursor`/`advance`). Unread is a count of eligible
      latest-per-id messages after the cursor — a query, not `head - cursor`:
      positions count blocks, so re-appends, tombstones, reactions, and
      unrelated feed objects must not inflate it.
- [ ] Implement the stubbed `Feed.cursor`/`Feed.next` as Effect streams.
- [ ] EDGE push: replace `FeedHandle`'s 1s polling via the sync protocol's
      subscription mechanism; keep polling fallback.
- [ ] Rebase the trigger dispatcher onto cursors; delete the unbounded
      `processedVersions` map.
- [ ] `mutationTypes` filter on `SubscriptionSpec.options`, checked before
      `fire(...)`.
- [ ] Constraints: cursors are position arithmetic, never local-block
      presence (eviction-proof under stage 2); keep per-`threadId` keyed
      sub-cursors possible (per-thread unread).

### Deferred (pull triggers, not a schedule)

- [ ] **Retention + epoch chaining (total-feed truncation)** — trigger: the
      _total_ feed's growth becomes an EDGE storage/replication problem.
      `Feed.setRetention` (on `FeedStore.deleteOldestBlocks`); prefix →
      snapshot compaction (block identity rules, idempotency tuple
      preservation); per-era feed chaining (only head live; era index object).
      Tombstones must not be compacted while any replica could hold the live
      object.
- [ ] **Delta blocks** — trigger: write amplification. Partial-object updates + field-level LWW; self-containedness rule so patches never strand a
      partial replica without a base snapshot.
- [ ] **App-defined projections** — exploratory; demand-gated. Deterministic
      folds with rematerialization keyed on a reducer/schema hash.

### Cross-cutting

- [ ] Explicit policy for schema-invalid feed items (`warn`/`ignore`/`fail`/
      callback) replacing today's silent `log.verbose` drop.
- [ ] Surface `getSyncState` (`blocksToPull`/`blocksToPush`) in devtools.
- [ ] Standing principle: product code consumes only the Feed API; sync keeps
      its injected-transport seam (`SyncClient` `sendMessage`).
