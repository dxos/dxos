---
'@dxos/plugin-discord': minor
'@dxos/assistant-toolkit': minor
---

Discord back-indexing runs without an agent: a space owner grants a server from the Discord connection page, picks channels and a history window, and a crawl on EDGE reads them through Composer's Discord bot, runs the pipeline-discord stages and writes facts to the space's memory; the page can pause, check now or restart the crawl, and Brain's Memory view can clear the store. The crawler reaches unread channels before re-reading finished ones, and a page of only system messages no longer ends a channel. The connection page gains a section slot (`ConnectorSurface.ConnectionSection`), the Debug companion gains an object-panel slot (`DebugSurface.ObjectPanel`) with KMS and trigger-manager panels and redacts secrets in its JSON view, and the trace panel names operations run on EDGE. Composer's agent now explores its skills and operations before saying it cannot answer.

Breaking: `CrawlDiscordChannels` and `ConfigureBackIndex` take a bot `applicationId` instead of a connection. `ExtractedQuestionStore` is removed from `@dxos/pipeline-discord`; read the questions it held from the fact store with `listQuestions`. The Memory skill (`org.dxos.skill.memory`) and its `Memory` type are removed, with the `@dxos/assistant-toolkit/Memory` and `@dxos/assistant-toolkit/MemorySkill` subpaths; agents keep knowledge in the space's memory and read it with Brain's fact tools.
