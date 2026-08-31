---
'@dxos/config': patch
'@dxos/plugin-client': patch
---

Resolve the hub URL outside the browser: `DX_HUB_URL` and other `DX_*` environment variables now
apply to node config loads, `runtime.services.hub.url` and a built-in default back up
`runtime.app.env.DX_HUB_URL`, and `dx account` commands no longer fail with "Hub URL not
configured".
