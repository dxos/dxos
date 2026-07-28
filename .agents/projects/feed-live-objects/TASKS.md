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

## Roadmap phases (post-merge; see DESIGN.md "Roadmap (post-#12235)")

The former deferred follow-ups, ordered as a dependency chain (1 → 2 → 3 → 4,
one PR each; 5 exploratory).

- [ ] **Phase 1 — version/order axis.** Wire `insertionId` through the codec +
      index path so the version axis is always present (today
      `KEY_QUEUE_POSITION`, null unless `assignQueuePositions` is on — Dmytro
      asked for `insertionId`; CodeRabbit flagged the default-off ordering
      guarantee). Correctness-shaped, not an optimisation. Document
      reorder-on-position-arrival semantics.
- [ ] **Phase 2 — consumer cursors + subscriptions.** Implement stubbed
      `Feed.cursor`/`Feed.next`; durable high-water cursor per subscription
      replaces the unbounded `processedVersions` map (and eventually
      content-signature diffing); add `SubscriptionSpec.options.mutationTypes`
      filter.
- [ ] **Phase 3 — delta blocks.** Partial-object update blocks + field-level
      LWW merge at the index; per-object fold rollback/replay on position
      reorder.
- [ ] **Phase 4 — retention + compaction.** Implement `Feed.setRetention`
      (`Feed.RetentionOptions`); compact superseded blocks by rewriting a
      prefix into a snapshot block.
- [ ] **Phase 5 — app-defined projections (exploratory).** Deterministic folds
      over feeds with rematerialization; demand-gated.
- [ ] **Cross-cutting.** Explicit policy for schema-invalid feed items
      (replacing silent drop); surface `getSyncState` in devtools.
