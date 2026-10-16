---
'@dxos/compute': minor
'@dxos/client': minor
'@dxos/protocols': minor
'@dxos/plugin-agent': minor
'@dxos/plugin-space': minor
---

Feed triggers can deliver several items per invocation and can be rewound to the start of their feed; agents extract facts from a feed into a fact feed; a space archive can carry only some feeds and merge into an existing space.

- `@dxos/compute`: `FeedSpec.batchSize` (and `Trigger.specFeed(feed, { batchSize })`) delivers that many consecutive feed items per invocation as `event.items`, in feed order; `event.item` stays the first. `Trigger.Manager.resetTrigger` rewinds a feed trigger's cursor so every item is delivered again, and fails with `TriggerNotResettableError` for any other kind. Every `Trigger.Manager` implementation must now provide `resetTrigger`.
- `@dxos/compute-runtime`: the local dispatcher honours `batchSize` and a reset cursor; `RemoteTriggerManager.Manager` gains `resetTrigger`.
- `@dxos/edge-compute` / `@dxos/edge-client`: a remote feed trigger is reset on EDGE (`EdgeHttpClient.resetTrigger`).
- `@dxos/plugin-agent`: `AgentOperation.ExtractFacts` extracts facts from a batch of messages into a fact feed (`FactFeed.FactItem`) and records what it read as a `FactFeed.ExtractionPass`, so messages a pass already covered — including in an imported feed — are not extracted again. `since`/`until` bound the time range.
- `@dxos/client` / `@dxos/protocols`: `space.internal.export({ feedIds })` writes a JSON archive holding only those feeds and their items; `client.spaces.import(archive, { into })` merges a JSON archive into an existing space, skipping objects and feed items it already holds.
- `@dxos/plugin-space`: `dx space export --feed <id>` and `dx space import --into <space>`.
