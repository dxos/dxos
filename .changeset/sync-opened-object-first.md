---
'@dxos/client': minor
---

`client.spaces.syncFirst(spaceId, objectId)` replicates an object, and the objects it references directly, before the rest of its space; the whole space follows once they have arrived, or after 30 s. Composer calls it for the object the app opens on.
