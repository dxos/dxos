# Live feed objects + subscription triggers — TASKS

PR **#12235** (branch `t3code/edb619e9`). See DESIGN.md for architecture.

## Status

Implementation complete. **PR is out of draft (ready for review)** as of
`5f720c70`. Merged `main` up to `5585ec89`; CI fully green on `fb5cd015`
(check, test, build, workerd, storybook, changeset-reminder). Dmytro's review
rounds addressed and replied to.

Blocking merge: no approving review yet, and the two CodeRabbit durability
threads below are still unanswered.

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
- Local at `8608c791`: build 84 tasks; lint 7 packages 0 warnings; `oxfmt` clean;
  tests `echo` 469, `echo-client` 508 (+7 expected fail), `echo-client-e2e` 282,
  `compute-runtime` 152, `compute` 46, `index-core` 34, `feed` 19 — all passing.
- `moon run :lint :build --affected` cannot complete in the agent sandbox: oxlint
  fails to spawn `tsgolint` in the unrelated `lockfile-explorer` package, which
  aborts the run before reaching our packages. Environmental — CI's `check` runs
  the same oxlint 1.74 / tsgolint 0.25 and passes. Lint our packages explicitly.

## Next / open

- [x] Check workflow green (done at `fb5cd015`).
- [ ] Decide on the two unanswered CodeRabbit durability claims (below) — they
      target the flush/dispose contract this PR promises, so they should get a
      verdict (fix or reasoned dismissal) rather than a silent resolve. Green CI
      is not evidence against them: no test covers either path.
- [ ] Resolve/reply to the 19 open review threads. Dmytro's 5 all have
      "Done in `<sha>`" replies but none are marked resolved.
- [x] Out of draft (`5f720c70`) — this also unblocks CodeRabbit, which refused to
      re-review while drafted and whose walkthrough still described the removed
      `isUpdate` / `ignoreUpdates` / `feed-delivery-state.ts`.
- [ ] Address the incoming CodeRabbit review (first real pass since Jul 16).
- [ ] Land: approving review, then merge queue; surface the Composer preview URL.

## Open review questions (not yet answered on the PR)

- `waitForPendingWrites` checks dirty state once and awaits only a _snapshot_ of
  `#inFlight`, so `Database.flush()` may resolve while a retry is still queued.
- `dispose()` reaches `#dirtyCores.clear()` before the scheduled append, so a
  same-tick `Obj.update` followed by close can drop the update.

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

## Deferred (not blocking; own follow-ups)

- Wire `insertionId` through the codec + index path so the version axis is always
  present. Today it is `KEY_QUEUE_POSITION`, which is null unless
  `assignQueuePositions` is on — Dmytro asked for `insertionId`, and CodeRabbit
  independently flagged that live objects lean on a default-off ordering
  guarantee. Correctness-shaped, not an optimisation.
- Partial-object update blocks + field-level LWW merge at the index; compaction/
  retention of superseded feed blocks (`Feed.RetentionOptions`).
- Bounded subscription-dedup state for the edge dispatcher (TTL / high-water
  cursor) instead of the unbounded `processedVersions` map.
- Optional `SubscriptionSpec.options.mutationTypes` filter (fire only on
  selected mutation types) — currently gated in the runnable.
