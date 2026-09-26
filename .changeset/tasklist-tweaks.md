---
'@dxos/react-ui-task': patch
'@dxos/react-ui-terminal': patch
---

A task's ID chip copies the task's full `echo://<space>/<id>` URI rather than `@mnemonic`, so the copied reference resolves wherever it is pasted; in the task list it reads the space from the live task rather than the row's snapshot.

The terminal prints JSON — an object, or a string holding a JSON object or array — indented and highlighted, with keys, strings, numbers, booleans and null colored through the theme's ANSI palette.
