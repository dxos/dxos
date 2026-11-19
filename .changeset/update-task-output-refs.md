---
'@dxos/plugin-tasks': patch
---

`UpdateTask` reports a changed assignee or delegate with its refs intact, so its output passes its own schema when a session claims a task: the delegate's `subject` was copied through JSON, which turned the ref into `{ "/": uri }` and failed the runtime's output check.
