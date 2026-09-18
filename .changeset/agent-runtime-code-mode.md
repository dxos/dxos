---
'@dxos/agent-runtime': minor
---

`@dxos/agent-runtime` adds `CodeMode`, a `TurnProducer` that runs an agent's turns in "code mode": the model carries exactly one tool, `eval`, and reaches the workspace by writing JavaScript against the ECHO API (`query`, `make`, `add`, `remove`, `update`, `flush`) rather than by calling a tool per action. Operations bound by the conversation's skills are not projected as tools at all — each is an async function on `ops` inside the sandbox — so a task spanning several of them costs one turn instead of one turn each. Only what the code passes to `print(...)` goes back into the model's context, and a throw is reported as output so the model can correct its own code rather than failing the turn.

Opt in with `makeCodeModeTurnProducer()` as `AgentProcessOptions.makeTurnProducer` (or `AgentService.Options.makeTurnProducer`); the process's queue, alarms, redelivery, delegation and hydration are unchanged, and the default `AiSession` producer still applies when it is not set.
