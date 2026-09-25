---
'@dxos/echo': minor
'@dxos/plugin-crm': patch
---

Add `Registry.typeAtom(registry, typename)`, a reactive lookup of a registered type entity, and use it when building app-graph nodes. Objects whose schema registered after their graph node was built no longer keep the placeholder icon until an unrelated change rebuilds the node.
