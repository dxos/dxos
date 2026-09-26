---
'@dxos/react-ui-task': patch
---

A task's ID chip copies the task's full `echo://<space>/<id>` URI rather than `@mnemonic`, so the copied reference resolves wherever it is pasted; in the task list it now reads the space from the live task rather than the row's snapshot.
