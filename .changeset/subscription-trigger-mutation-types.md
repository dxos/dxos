---
'@dxos/compute': minor
---

Subscription triggers now report a real mutation type on `TriggerEvent.FeedEvent`'s sibling `SubscriptionEvent.type` — `'created' | 'updated' | 'deleted'` (previously the placeholder `'unknown'`; the field is now a narrowed literal). Added `Trigger.specSubscriptionFromFeed` to build a feed-scoped subscription so subscription semantics (create/update/delete) apply to feed items, not just the space database. Change detection is content-signature based (feed-backed objects are unversioned), and feed deletes are detected by an id-set diff since feed removals leave no queryable tombstone.
