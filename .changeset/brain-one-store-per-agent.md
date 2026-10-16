---
'@dxos/plugin-agent': minor
---

Keep facts in one store per agent: mailbox analysis and the Discord crawl now write into the brain of the agent they are given (failing with `AgentRequiredError` when given none), and the facts operations and companion read the space's agents' brains. Breaking: plugin-brain's `FactStoreRegistry` capability and per-space `FactStore` layer are removed, and `AnalyzeMailbox` / `CrawlDiscordChannels` take an `agent`. Adds `BrainService.PushOptions.storeOnly`, which stores pushed facts without waking subscriptions.
