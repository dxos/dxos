---
'@dxos/agent-runtime': patch
---

A chat switched to another agent before its first message now runs that message on the chosen agent; previously the agent process started when the chat opened kept answering on the default assistant until a later turn.
