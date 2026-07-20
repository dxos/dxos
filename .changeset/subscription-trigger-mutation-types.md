---
'@dxos/compute': minor
---

Subscription triggers now report a real mutation type on `SubscriptionEvent.type` — `'created' | 'updated' | 'deleted'` (previously the placeholder `'unknown'`; the field is now a narrowed literal). Subscription semantics (create/update/delete) apply uniformly to both the space database and feed items — build a feed-scoped subscription with `Trigger.specSubscription(Query.select(...).from(Scope.feed(...)))`. Change detection is content-signature based (feed-backed objects are unversioned), and deletes are detected uniformly via queryable tombstones (`deleted: 'include'` + `Obj.isDeleted`) for both sources — a feed removal now leaves a body-preserving tombstone in the index.
