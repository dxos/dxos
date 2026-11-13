---
'@dxos/plugin-host-cloudflare': patch
---

A plugin bundle on EDGE now resolves its own skills by registry URI, and the tools those skills name, because each space-scoped invocation's registry holds the plugin's skills and operation records beside its types.
