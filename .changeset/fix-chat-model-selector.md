---
'@dxos/echo': patch
---

Keep refs intact in object-property atoms: `useObject(obj, refField)` shallow-copied the ref, dropping `uri`/`target` (prototype getters over private fields) and handing consumers an empty object. The chat's model selector read the selection back as unset and never moved.
