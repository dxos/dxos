---
'@dxos/assistant': patch
---

The `update-tasks` instructions and the `task` field description now document the ref as the plain `echo://` URI from the checklist line's link, matching what the schema accepts. They previously showed a `{ "/": "echo://…" }` wrapper, which every call sent first and the schema rejected with `Expected string`, costing a retry before the model fell back to the bare URI.
