---
'@dxos/agent-runtime': patch
---

An agent's first request on a new chat now runs with the skills bound when the chat was made, even when its process opened before EDGE indexed those bindings; every request records the skills its end-request hooks were resolved against.
