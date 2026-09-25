---
'@dxos/app-framework': patch
---

`Surface` holds its previous `data` reference while the incoming one is shallow-equal to it, so an ancestor render no longer re-renders the plugin subtree below a surface.

`shallowEqual` moves to `@dxos/util` (with `useStable` in `@dxos/react-hooks`) and now compares array shape, so `app-graph` node-change detection tells `[]` from `{}` and notices a trailing hole.
