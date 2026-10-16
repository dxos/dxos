---
'@dxos/protocols': minor
'@dxos/edge-client': minor
'@dxos/plugin-agent': minor
'@dxos/plugin-discord': minor
---

Clients can configure, control and observe EDGE's back-index of Discord channels into an agent's brain.

- `@dxos/protocols`: `BrainCrawlProtocol` mirrors EDGE's crawl wire schemas (`PutCrawlRequest`, `ResetCrawlRequest`, `CrawlStatus`, `CrawlTarget`, `RunStatus`).
- `@dxos/edge-client`: `EdgeHttpClient.putCrawl`, `getCrawlStatus`, `pauseCrawl`, `resumeCrawl` and `resetCrawl` call compute-service's `/compute/brain/:spaceId/:agentId/crawl` routes as a space member and decode the `CrawlStatus` they answer with.
- `@dxos/plugin-agent`: `AgentOperation.ConfigureCrawl`, `GetCrawlStatus`, `PauseCrawl`, `ResumeCrawl` and `ResetCrawl` drive those routes for an agent; `ConfigureCrawl` takes the fact feed as a ref and sends its EID.
- `@dxos/plugin-discord`: `DiscordChannel.kaiApplicationId` and `KAI_APPLICATION_IDS` name the EDGE-hosted Kai bot outside the plugin.
