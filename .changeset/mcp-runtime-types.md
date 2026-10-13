---
'@dxos/compute-runtime': patch
---

Types defined through `space.addType` now hold objects without declaring `id`, can be relation types, and store a new definition for a new version; `space.queryObjects` finds objects of such types by typename, and a remote caller can pass references to `space.addRelation`.
