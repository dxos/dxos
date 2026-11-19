---
'@dxos/plugin-discord': minor
---

Discord back-indexing runs without an agent: a space owner grants a server from the Discord connection page, picks channels, and the crawl reads them through Composer's Discord bot, runs the pipeline-discord stages and writes facts to the space's memory. The connection page gains a section slot (`ConnectorSurface.ConnectionSection`) for connector-specific UI, and the Debug companion gains an object-panel slot (`DebugSurface.ObjectPanel`) with KMS and trigger-manager panels; its JSON view redacts secrets. `CrawlDiscordChannels` and `ConfigureBackIndex` take a bot `applicationId` instead of a connection.
