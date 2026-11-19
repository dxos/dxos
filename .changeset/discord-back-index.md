---
'@dxos/plugin-discord': minor
'@dxos/assistant-toolkit': minor
---

Discord back-indexing runs without an agent: a space owner grants a server from the Discord connection page, picks channels, and the crawl reads them through Composer's Discord bot, runs the pipeline-discord stages and writes facts to the space's memory; the page can pause, check now or restart the crawl, and Brain's Memory view can clear the store. The connection page gains a section slot (`ConnectorSurface.ConnectionSection`) for connector-specific UI, and the Debug companion gains an object-panel slot (`DebugSurface.ObjectPanel`) with KMS and trigger-manager panels; its JSON view redacts secrets. Composer's agent now explores its skills and operations before saying it cannot answer.

Breaking: `CrawlDiscordChannels` and `ConfigureBackIndex` take a bot `applicationId` instead of a connection. The Memory skill (`org.dxos.skill.memory`) and its `Memory` type are removed, with the `@dxos/assistant-toolkit/Memory` and `@dxos/assistant-toolkit/MemorySkill` subpaths; agents keep knowledge in the space's memory and read it with Brain's fact tools.
