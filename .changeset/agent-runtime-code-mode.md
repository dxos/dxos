---
'@dxos/agent-runtime': minor
---

`@dxos/agent-runtime` adds `CodeMode`, a `TurnProducer` that runs an agent's turns in "code mode": the model carries exactly one tool, `eval`, and reaches the workspace by writing code rather than by calling a tool per action. Operations bound by the conversation's skills are not projected as tools at all — each is a function the code calls — so a task spanning several of them costs one turn instead of one turn each. Only what the code prints goes back into the model's context, and a failure is reported as output so the model can correct its own code rather than failing the turn.

Two pieces are injected. `Sandbox` decides where the code runs: `Sandbox.inProcess` evaluates via `new AsyncFunction` here and now, and a `node:vm` context, a worker or a Cloudflare worker-loader isolate can be installed in its place (`Sandbox.layerInProcess`, or `CodeModeOptions.sandbox`). `Dialect` decides what the model writes: `PlainDialect` is a small async facade (`await query(...)`, `update(obj, mutator)`, `await ops.thing(input)`) whose bindings are plain functions and data, so it survives an out-of-process sandbox; `EffectDialect` is the repo's own ECHO API as an `Effect.gen` body (`yield* Database.query(Filter.type(types['...'])).run`), which reads like committed code but pins the sandbox to this process.

Opt in with `makeCodeModeTurnProducer({ dialect })` as `AgentProcessOptions.makeTurnProducer` (or `AgentService.Options.makeTurnProducer`); the process's queue, alarms, redelivery, delegation and hydration are unchanged, and the default `AiSession` producer still applies when it is not set.
