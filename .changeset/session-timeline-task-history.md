---
'@dxos/types': minor
---

The session timeline now bounds task lanes by the task's own history (first move to `started` to the last move out of it) and draws each history entry as a node, so tasks worked outside the trace still show on the pipeline chart. Task change entries record the transition as `status` / `previousStatus`, and `Task.getStatusChanges` reads it back, falling back to the note for entries logged before.
