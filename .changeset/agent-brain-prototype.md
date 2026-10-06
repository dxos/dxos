---
'@dxos/plugin-agent': minor
'@dxos/compute': minor
---

Agents gain a brain: each member talks to an agent in their own private chat, the agent records facts from every turn in an RDF fact store and watches them against the goals people set, and a matching fact wakes the requester's chat with an update. The brain runs in memory locally and as a SQLite Durable Object on EDGE. Fact extraction now works with Anthropic structured output, and `@dxos/compute` adds `Process.EnvironmentService`, `OperationHandlerSet.remote` and `SubmitPromptOptions.properties`.
