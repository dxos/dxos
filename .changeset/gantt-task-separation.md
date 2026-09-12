---
'@dxos/assistant': minor
'@dxos/assistant-toolkit': minor
'@dxos/plugin-assistant': minor
'@dxos/react-ui-components': minor
---

The session gantt now separates a run's events by task.

The planning tool writes a new `assistant.taskStatusChanged` trace event whenever a checklist task's status changes — the only in-trace record of which task an agent was working on. `buildSessionTimeline` reads those events to cut a session into one segment per task: the task lane gets a span of its own, nodes where it started and finished, and every marker inside the segment is attributed to it rather than piling onto the session bar.

A task that is only ever closed — delegation marks everything it hands over `started` before the agent's first turn — is cut from the previous boundary, so a delegated run separates too.
