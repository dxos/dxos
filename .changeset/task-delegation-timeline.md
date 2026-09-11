---
'@dxos/plugin-projects': patch
---

Delegating project tasks to an agent is now idempotent: `DelegateTaskToChat` skips tasks the agent already holds, and the project toolbar's assign action is disabled while an invocation is in flight. The agent runtime emits an `assistant.delegationSpawned` trace event that joins a delegated sub-agent's process to its task, `@dxos/plugin-assistant` gains a `buildSessionTimeline` data layer turning traces into session and task lanes, and `@dxos/react-ui-components` gains a prototype `Gantt` component rendering those lanes with dependency and delegation connectors.
