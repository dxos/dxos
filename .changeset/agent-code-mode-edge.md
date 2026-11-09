---
'@dxos/agent-code-mode': patch
'@dxos/plugin-agent': patch
'@dxos/types': patch
---

Code mode records which operations each `eval` ran on its result (`ToolResult.invocations`: their keys, not their outputs), and `ensureReplySent` counts a channel send among them as the reply, so a reply sent from code is no longer followed by a reminder. Code mode's types section names a tagged union of more than four variants by its tags, and says to print an existing value to see a variant's fields.
