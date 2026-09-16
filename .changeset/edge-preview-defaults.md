---
'@dxos/config': patch
'@dxos/plugin-client': patch
'@dxos/ai': patch
'@dxos/edge-client': patch
---

Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`), including
`@dxos/edge-client`'s `DEFAULT_IMAGE_SERVICE_URL` (the retired `image-service-main` workers.dev
name no longer resolves).
