---
'@dxos/agent-code-mode': patch
'@dxos/plugin-agent': patch
'@dxos/types': patch
---

Code mode's plain dialect lists each operation's input field by field with the field's own description, and names a large tagged union by its tags, so an agent's prompt is well under half the size of the tool schemas it replaces. Code mode records the operations each `eval` ran on its result (`ToolResult.invocations`), and `ensureReplySent` reads them, so a reply sent from code is no longer followed by a reminder. `@dxos/agent-code-mode` is published to pkg.pr.new so EDGE can install it.
