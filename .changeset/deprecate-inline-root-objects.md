---
'@dxos/echo': minor
---

Space directories no longer hold objects: every new object, space properties and imported objects included, gets a document of its own linked from the directory, and the host moves objects that older clients inlined into the directory into linked documents when a space opens. Breaking: `Database.add` no longer accepts `placeIn`, and the `ObjectPlacement` and `AddCoreOptions` types are removed.
