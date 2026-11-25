---
'@dxos/compute': minor
'@dxos/types': minor
---

Agents and sessions now live in one `@dxos/compute/Agent` module: `Agent.Session` (formerly `@dxos/assistant/Chat`, same DXN), `Agent.Agent` (formerly `@dxos/assistant/Agent`) and `Agent.Service` (formerly `@dxos/compute/AgentService`), with session verbs such as `Agent.submitPrompt(session, prompt)` replacing the session handle. Breaking: `HarnessService` is removed in favour of `Agent.currentSession` and the `AiContext` / `TrajectoryStore` current-session helpers; `AgentProcess` is renamed `SessionProcess`; `makeInitialized` and `resetChatHistory` move to `@dxos/assistant/AgentSetup`; `Agent.addTask` / `deleteTask` require `Database.Service` instead of taking a database; `Agent.linkCompanion` takes `{ session, subject }` and `CompanionChatAnnotation` is renamed `Agent.CompanionSessionAnnotation` (stored id unchanged); `Agent.isOpenTask` moves to `Task.isOpen`, beside the new `Task.formatChecklist`. `Process.current`, `Agent.Thread` and the session, agent and thread process annotations are new.
