---
'@dxos/react-ui-task': patch
---

Task rows read their state more honestly: an unset estimate shows the same dot the priority control
uses rather than an en dash, and the status glyph spins while an agent is actually working a task —
assigned to one and started. Delegating a task to a chat now assigns it to that agent.

A reasoning or synthetic block whose text fences anything in tags of its own is no longer truncated
at the first tag, and its icon sits on the first line of the text rather than 2px below it.

`@dxos/util` gains `concat` (a tagged template joining its lines with a space) and `lines` (the same
dedent as `trim`, returning the lines unjoined).
