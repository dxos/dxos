---
'@dxos/compute-runtime': patch
'@dxos/edge-compute': patch
---

A remote process whose host no longer has it (EDGE answers 404, e.g. after its state was wiped) now fails in place instead of retrying the same input forever, so the agent's next turn starts a new process for the chat.
