---
'@dxos/echo-client': patch
---

Loading an object with a parent no longer reports it missing while the parent is still loading. A fresh client, such as each operation invocation on EDGE, could not load an object another invocation had just created until EDGE had indexed it: `Database.load` threw `EntityNotFoundError`.
