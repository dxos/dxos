---
'@dxos/app-framework': patch
---

A plugin chunk that declares its own top-level `Map` (such as plugin-map's ECHO type) now loads instead of failing with "is not a constructor", and EDGE's plugin loader ships only the modules that run on workerd, leaving out browser-only bodies and the UI packages they vendor.
