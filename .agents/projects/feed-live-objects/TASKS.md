# Live feed objects + subscription triggers — TASKS

PR **#12235** (branch `t3code/edb619e9`). See DESIGN.md for architecture.

## Status

Implementation complete; PR open (draft). Merged `main` up to `0f4bb22993`;
build green (313 tasks), touched-package tests green, memoized caches
regenerated. Dmytro's review rounds addressed and replied to.

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

## Next / open

- [ ] Watch the Check workflow to green on the latest push (`0f4bb22993`);
      fix any CI failures at root.
- [ ] Land: take the PR out of draft when ready; use submit-pr/land skill;
      surface the Composer preview URL.
- [ ] Address any new review comments.

## Deferred (not blocking; own follow-ups)

- Partial-object update blocks + field-level LWW merge at the index; compaction/
  retention of superseded feed blocks (`Feed.RetentionOptions`).
- Bounded subscription-dedup state for the edge dispatcher (TTL / high-water
  cursor) instead of the unbounded `processedVersions` map.
- Optional `SubscriptionSpec.options.mutationTypes` filter (fire only on
  selected mutation types) — currently gated in the runnable.
