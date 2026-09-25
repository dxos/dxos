---
'@dxos/types': minor
---

The session timeline now bounds task lanes by the task's own history (first move to `started` to the last move out of it) and draws each history entry as a node, so tasks worked outside the trace still show on the pipeline chart; `Task.getStatusChanges` reads the status transitions back out of a task's log.
