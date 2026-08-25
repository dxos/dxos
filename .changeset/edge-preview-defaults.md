---
'@dxos/config': patch
'@dxos/plugin-client': patch
'@dxos/ai': patch
---

Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`).
