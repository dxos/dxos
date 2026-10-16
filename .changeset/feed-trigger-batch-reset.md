---
'@dxos/compute': minor
---

Feed triggers can deliver several items per invocation, and can be rewound to the start of their feed.

- `@dxos/compute`: `FeedSpec.batchSize` (and `Trigger.specFeed(feed, { batchSize })`) delivers that many consecutive feed items per invocation as `event.items`, in feed order; `event.item` stays the first. `Trigger.Manager.resetTrigger` rewinds a feed trigger's cursor so every item is delivered again, and fails with `TriggerNotResettableError` for any other kind. Every `Trigger.Manager` implementation must now provide `resetTrigger`.
- `@dxos/compute-runtime`: the local dispatcher honours `batchSize` and a reset cursor; `RemoteTriggerManager.Manager` gains `resetTrigger`.
- `@dxos/edge-compute` / `@dxos/edge-client`: a remote feed trigger is reset on EDGE (`EdgeHttpClient.resetTrigger`).
