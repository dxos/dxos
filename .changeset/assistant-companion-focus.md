---
'@dxos/plugin-assistant': patch
---

A companion chat no longer takes keyboard focus when it mounts, so typing in the document it sits beside stays in that document. `ChatPrompt` takes an `autoFocus` prop, on by default.
