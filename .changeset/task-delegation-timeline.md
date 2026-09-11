---
'@dxos/plugin-projects': patch
---

Delegating project tasks to an agent is now idempotent: `DelegateTaskToChat` skips tasks the agent already holds, and the project toolbar's assign action is disabled while an invocation is in flight. The agent runtime emits an `assistant.delegationSpawned` trace event that joins a delegated sub-agent's process to its task; `@dxos/plugin-assistant` gains a `buildSessionTimeline` data layer turning traces into session and task lanes, and `@dxos/react-ui-components` gains a `Gantt` component rendering those lanes as bars with event nodes, dependency and delegation connectors. Also fixed: a task list row's tags take at most half the row and scroll instead of collapsing the title, the trace timeline's `Generating…` spinner no longer detaches from the graph after a completed request, and sync-status labels truncate with an ellipsis inside the progress popover.
