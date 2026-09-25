---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

The session gantt now separates a run's events by task.

Both tools that move a task's status — the planning tool's `update-tasks` and `plugin-tasks`' `UpdateTask` — write a new `task.statusChanged` trace event. Nothing else in a trace says which task an agent was working on, so `buildSessionTimeline` reads those events to cut a session into one segment per task: the task lane gets a span of its own, nodes where it started and finished, and every marker inside the segment is attributed to it rather than piling onto the session bar.

Only tasks on the session's own checklist take part in the cut, and a task that is only ever closed — delegation marks everything it hands over `started` before the agent's first turn — is cut from the previous boundary, but only on the transition out of `started`: a task merely dismissed claims nothing, and a second close (`review` → `done`) mints no segment overlapping the task then active. A delegated task is drawn as the child session that worked it, so its segment is dropped rather than moved onto a bar whose span does not contain those markers.

The project's pipeline chart also draws its own lane names and per-lane totals: a ledger row is several lines tall and a chart row is one, so nothing lined up between them.
