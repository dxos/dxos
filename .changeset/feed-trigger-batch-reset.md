---
'@dxos/compute': minor
'@dxos/client': minor
'@dxos/protocols': minor
'@dxos/plugin-agent': minor
'@dxos/plugin-discord': minor
'@dxos/plugin-space': minor
---

Feed triggers can deliver several items per invocation and can be rewound to the start of their feed; agents keep their extracted facts in a fact feed; Discord messages map to crawler messages without the browser transport; a space archive can carry only some feeds and merge into an existing space.

- `@dxos/compute`: `FeedSpec.batchSize` (and `Trigger.specFeed(feed, { batchSize })`) delivers that many consecutive feed items per invocation as `event.items`, in feed order; `event.item` stays the first. `Trigger.Manager.resetTrigger` rewinds a feed trigger's cursor so every item is delivered again, and fails with `TriggerNotResettableError` for any other kind. Every `Trigger.Manager` implementation must now provide `resetTrigger`.
- `@dxos/compute-runtime`: the local dispatcher honours `batchSize` and a reset cursor; `RemoteTriggerManager.Manager` gains `resetTrigger`.
- `@dxos/edge-compute` / `@dxos/edge-client`: a remote feed trigger is reset on EDGE (`EdgeHttpClient.resetTrigger`).
- `@dxos/plugin-agent`: `FactFeed.FactItem` (`org.dxos.type.agent.fact`) is one `RDF.Fact` as a fact feed item, the exportable record of what an agent's brain extracted; EDGE's back-index appends to it.
- `@dxos/plugin-discord`: `@dxos/plugin-discord/DiscordMessage` exports the Discord-to-crawler message mapping (`mapDiscordMessage`, `threadRefsOf`, `snowflakeForTimestamp`) with no runtime dependency on `dfx`, so a worker can serve `@dxos/crawler`'s `Source`.
- `@dxos/client` / `@dxos/protocols`: `space.internal.export({ feedIds })` writes a JSON archive holding only those feeds and their items; `client.spaces.import(archive, { into })` merges a JSON archive into an existing space, skipping objects and feed items it already holds.
- `@dxos/plugin-space`: `dx space export --feed <id>` and `dx space import --into <space>`.
