---
'@dxos/plugin-messenger': patch
---

The inbox materializer converges notification containers only when the container set changes, so passes triggered by inbox, contacts or space-list updates no longer query the space when there is nothing to do. `materialize` takes an optional `converge` flag (default `true`).
