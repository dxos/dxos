---
'@dxos/client': minor
---

`client.spaces.syncFirst(spaceId, objectId)` replicates an object, and the objects it references directly, before the rest of its space, which follows once they have arrived or after 30 s. Composer calls it for the object a link opens, and renders that object as soon as it arrives rather than after the whole space has replicated and been indexed.
