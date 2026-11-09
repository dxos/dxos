---
'@dxos/echo': patch
---

Loading an object by reference now resolves its type from the registered type sources when the registry lacks it, so an object whose type another plugin publishes arrives with a schema to read and write through.
