# Live feed objects + subscription triggers — TASKS

PR **#12235** (branch `t3code/edb619e9`). See DESIGN.md for architecture.

## Status

Implementation complete; PR open (draft). Merged `main` up to `bf055c8b` at
`8608c791`; build, lint, format, and all touched-package tests green locally
(see Verification). Dmytro's review rounds addressed and replied to.

Still in draft deliberately: the two CodeRabbit durability threads below are
unanswered, and there is no approving review yet.

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

## Verification (at `8608c791`)

- Build: 84 tasks green across `echo`, `echo-client`, `index-core`, `compute`.
- Lint: 7 touched packages, 0 warnings / 0 errors. `oxfmt --check` clean.
- Tests: `echo` 469, `echo-client` 508 (+7 expected fail), `echo-client-e2e` 282,
  `compute-runtime` 152, `compute` 46, `index-core` 34, `feed` 19 — all passing.

## Next / open

- [ ] Watch the Check workflow to green on `8608c791`; fix failures at root.
- [ ] Decide on the two unanswered CodeRabbit durability claims (below) — they
      target the flush/dispose contract this PR promises, so they should get a
      verdict (fix or reasoned dismissal) rather than a silent resolve.
- [ ] Resolve/reply to the 19 open review threads. Dmytro's 5 all have
      "Done in `<sha>`" replies but none are marked resolved.
- [ ] Land: take out of draft, get an approving review, merge queue; surface the
      Composer preview URL.

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

## Deferred (not blocking; own follow-ups)

- Partial-object update blocks + field-level LWW merge at the index; compaction/
  retention of superseded feed blocks (`Feed.RetentionOptions`).
- Bounded subscription-dedup state for the edge dispatcher (TTL / high-water
  cursor) instead of the unbounded `processedVersions` map.
- Optional `SubscriptionSpec.options.mutationTypes` filter (fire only on
  selected mutation types) — currently gated in the runnable.
