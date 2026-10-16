---
'@dxos/plugin-agent': minor
---

Mailbox analysis, the Discord crawl and plugin-brain's fact tools now read and write the named agent's brain instead of separate in-memory fact stores, so each agent has one fact store. Breaking: `CrawlDiscordChannels` and `AnalyzeMailbox` take an `agent` and fail with `NoTargetAgentError` without one, and plugin-brain's `FactStoreRegistry` capability is removed. New: `BrainService` push accepts `storeOnly` (store facts without waking subscriptions), `FactQuery` accepts `minConfidence`, and `@dxos/plugin-agent/BrainFacts` exposes an agent's brain as a pipeline-rdf `FactStore`.
