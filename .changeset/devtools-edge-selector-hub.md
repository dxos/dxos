---
'@dxos/devtools': patch
---

Picking an EDGE in the devtools EDGE selector now sets the hub config entry (`runtime.services.hub.url`, `<edge>/hub/`) along with the EDGE entry, so the two always name the same environment. Build-time `runtime.app.env` values are left as built.
