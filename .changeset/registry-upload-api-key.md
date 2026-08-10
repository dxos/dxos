---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

`dx registry publish` authenticates the edge upload with `DX_HUB_API_KEY` when set, so headless callers without a HALO identity can publish.
