---
'@dxos/edge-client': patch
---

Report edge connection uptime as whole seconds, fixing the `invalid int32` error thrown when encoding `EdgeStatus`.
