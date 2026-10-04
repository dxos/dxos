---
'@dxos/echo': patch
---

Mark the SDK, UI and plugin packages `"sideEffects": false` (or a precise list where a module registers a stylesheet, custom element, devtools formatter or diagnostic), so bundlers drop modules that are re-exported through a barrel but never used.
