---
'@dxos/plugin-assistant': patch
---

Fix the chat prompt silently dropping a message submitted while the agent was still streaming a response. The send control now queues it and sends it automatically once the current turn finishes, instead of discarding it.
