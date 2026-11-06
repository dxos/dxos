---
'@dxos/agent-code-mode': patch
'@dxos/plugin-agent': patch
'@dxos/types': patch
---

Code mode records the operations each `eval` ran on its result (`ToolResult.invocations`), and `ensureReplySent` reads them, so a reply sent from code is no longer followed by a reminder. Code mode's types section names a tagged union of more than four variants by its tags, and says to print an existing value to see a variant's fields. The plain dialect states the object-reference format once, in a References note, instead of in every reference field of every operation's input schema; each reference field keeps its own description, and prompts with no reference field are unchanged.
