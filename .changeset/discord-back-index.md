---
'@dxos/crawler': minor
'@dxos/plugin-discord': minor
---

A Discord back-index is a trigger-run operation that appends extracted facts to a fact feed, with its progress in ECHO; an agent's brain on EDGE only indexes the fact feeds registered with it.

- `@dxos/crawler`: `CrawlState` is an ECHO type holding a crawl's frontier, per-target cursors, run status and the content hash of every message already extracted; `StateStore.layerEcho(state)` keeps the crawler's state in it, so a crawl resumes wherever the space is open.
- `@dxos/plugin-discord`: `DiscordOperation.CrawlDiscordChannels` now takes `state` (a `CrawlState`) and `facts` (a fact feed), runs at most `maxSteps` pages per invocation with the space's Discord token, extracts a page per model request and appends `FactFeed.FactItem`s to the feed; it no longer keeps a session SQLite runtime. `DiscordOperation.ConfigureBackIndex` creates or updates the crawl state, fact feed and the remote timer trigger that runs it. `DiscordSource.Endpoint` lets a host point the Discord REST client at another base and fetch it directly rather than through the CORS proxy.
- `@dxos/plugin-agent`: `AgentOperation.AddFactFeed`, `RemoveFactFeed` and `ListFactFeeds` register fact feeds with the agent's brain on EDGE, through `EdgeHttpClient.addBrainFactFeed`, `removeBrainFactFeed` and `listBrainFactFeeds`.
- `@dxos/plugin-discord`: `DiscordChannel.kaiApplicationId` and `KAI_APPLICATION_IDS` name the EDGE-hosted Kai bot outside the plugin.
