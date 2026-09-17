---
'@dxos/assistant': patch
---

The `update-tasks` instructions now document a task ref as the plain `echo://` URI from the checklist line's link, matching what the tool schema accepts. They previously showed a `{ "/": "echo://…" }` wrapper, so nearly every planning call opened with a rejected `Expected string` update and recovered on a retry; the wasted round trip also disrupted multi-turn planning. The `task` field's own description is updated to match, though the tool-schema projection currently drops per-field descriptions on ref properties.
