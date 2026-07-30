# Live feed objects + subscription triggers — TASKS

PR **#12235** (branch `t3code/edb619e9`). See DESIGN.md for architecture.

## Status

**PR #12235 MERGED** to `main` as `7b270f2e`. Remaining work is the phased
roadmap below (see DESIGN.md "Roadmap (post-#12235)"), each phase its own PR.

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

## Roadmap phases (see DESIGN.md "Roadmap"; revised 2026-07-29)

Sequenced by product pull: email drives scale-out (phases 3–4), first-party
chat channels inherit it. Dependency chain 1 → 2 → 3 → 4, one PR each; 5 and 6
demand-gated.

### Phase 1 — version/order axis (NEXT)

Correctness-shaped: v1 live objects lean on `KEY_QUEUE_POSITION`, null unless
`assignQueuePositions` is on (Dmytro asked for `insertionId`; CodeRabbit
flagged the default-off guarantee). Also the chat ship gate.

- [ ] Wire `insertionId` through `EchoFeedCodec` and the index path so every
      hydrated feed object carries a version axis.
- [ ] `FeedObjectCore` baseline: `position` when present, else Lamport
      `(sequence, actorId)`, else `insertionId` — never null.
- [ ] Document reorder-on-position-arrival semantics (positions re-sort only;
      per-object latest unaffected).
- [ ] Tests: offline appends order stably pre-position; order converges on
      position assignment; cross-tab concurrent `Obj.update` baseline check.

### Phase 2 — consumer cursors, read state, push

- [ ] Implement stubbed `Feed.cursor`/`Feed.next`/`nextOption` as Effect
      streams over the phase-1 axis.
- [ ] Durable per-consumer high-water cursor: decide storage home (consumer's
      own object vs feed metadata) and API (`Feed.getCursor`/`advance`).
- [ ] Rebase the trigger dispatcher onto cursors; delete the unbounded
      `processedVersions` map.
- [ ] `SubscriptionSpec.options.mutationTypes` filter checked before
      `fire(...)`.
- [ ] EDGE push: use the sync protocol's existing Subscribe/subscription
      mechanism to replace `FeedHandle`'s 1s polling; keep polling fallback.
- [ ] Constraint from chat: do NOT design out per-`threadId` high-water marks
      (per-thread unread); cursor model should permit keyed sub-cursors later.
- [ ] Constraint from chat stages 5–9: the trigger/subscription machinery
      gains a second consumer — agent session wake-up (delivery = enqueue
      into an EDGE-hosted session process, not a notification op); keep the
      dispatch target pluggable.

### Phase 3 — retention + epoch chaining

- [ ] Implement `Feed.setRetention` (`RetentionOptions`), building on
      `FeedStore.deleteOldestBlocks`.
- [ ] Compaction: rewrite a prefix into a snapshot block; define block
      identity rules for the rewritten range (idempotency tuple preservation).
- [ ] Epoch-chaining convention + helper: logical stream = chain of per-era
      feeds, only head live; era index object; document for mailbox + channel
      use.
- [ ] Interaction check: retention vs tombstones (a tombstone must not be
      compacted away while any replica could still hold the live object).
- [ ] Constraint from chat stages 5–9: agent session-per-thread mints feeds at
      mention-cadence against the ~1000 feeds/space budget, and concluded
      session feeds are disposable — retention design should cover whole-feed
      GC/archival, not only within-feed compaction.

### Phase 4 — sparse feeds (email-scale partial history)

- [ ] Range-map bookkeeping: local block set = replicated tail + evictable
      cached dense ranges; loose (ref-resolved) blocks never enter the map.
- [ ] Remote range queries against non-replicated history (protocol fields
      exist: `before`/`after`/`begin_position`/`end_position`/`reverse`).
- [ ] `patchUp` contract: a range response includes the latest block for any
      id whose head lies outside the range (keeps latest-per-id sound).
- [ ] Watermarked domain-order paging: backend domain-key index (EDGE);
      cursor = `(domainKey, id, positionWatermark)`; live tail patches
      rendered pages.
- [ ] Eviction: LRU under a per-feed/space budget; pinned ranges (tail
      always); define ref-into-evicted-range behavior (deref goes remote).
- [ ] Define against the `FeedBackend` interface shape, not EDGE specifics
      (companion workstream — keeps external backends a swap).

### Demand-gated

- [ ] **Phase 5 — delta blocks.** Partial-object updates + field-level LWW +
      per-object fold replay on reorder; self-containedness rule so patches
      never strand a sparse replica without a base snapshot.
- [ ] **Phase 6 — app-defined projections.** Deterministic folds with
      rematerialization keyed on a reducer/schema hash.

### Cross-cutting

- [ ] Explicit policy for schema-invalid feed items (`warn`/`ignore`/`fail`/
      callback) replacing today's silent `log.verbose` drop.
- [ ] Surface `getSyncState` (`blocksToPull`/`blocksToPush`) in devtools.
- [ ] Standing principle: product code consumes only the Feed API; sync keeps
      its injected-transport seam (`SyncClient` `sendMessage`).
