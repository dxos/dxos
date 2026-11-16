---
'@dxos/app-framework': patch
---

A plugin built outside the dxos workspace with only `@dxos/plugin-host-cloudflare` installed now vendors the host's own dependencies, such as `@dxos/blob/hosted`, so `dx registry publish` no longer fails with `Could not resolve`.
