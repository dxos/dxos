---
'@dxos/react-ui-trace': minor
---

The session timeline now bounds task lanes by each task's own edit history (first move to `started` to the last move out of it, read with `Obj.getChanges`) and draws its status moves, questions and answers as nodes, so tasks worked outside the trace still show on the pipeline chart.
