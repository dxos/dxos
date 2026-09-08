---
'@dxos/echo': patch
'@dxos/echo-client': patch
---

ECHO internals cleanup, plus two serialization fixes.

`Database.TypeId` now uses the registry key `@dxos/echo/Database/TypeId`. It previously shared `@dxos/echo/Database` with the `[ObjectDatabaseId]` accessor that every ECHO object carries, which made the two the same symbol and `Database.TypeId in obj` true for every object in the graph. `Database.isDatabase` was unaffected (it compares the value, not just the key), but a brand check written as a bare `in` test would have misfired. Consumers that import `Database.TypeId` need no change; only code that hard-coded `Symbol.for('@dxos/echo/Database')` to brand a database is affected.

`Obj.toJSON` now emits `@deleted` for a tombstone. `Obj.fromJSON` already read the field, so a deleted object re-serialized through JSON (feed compaction, a snapshot hand-off) came back as a live object.

`Obj.toJSON`'s documentation no longer claims to match `JSON.stringify(obj)` unconditionally: that holds for an in-memory object, but a database-backed object carries its own serializer, which omits `@uri` and leaves `Uint8Array` values unencoded. Unifying the two is left as a follow-up, since it changes what `JSON.stringify` emits for every database object.

A write to a bound document now refreshes its proxy targets once rather than twice — the second pass re-read the object's full width with the narrowing scope already closed.

Removed unused internals: the `objectData` debug symbol (use `Obj.toJSON`), and the dead `getObjectDocument`, `coreInspectLabel`, `isBehaviourAccessor` and throttling-bypass constants.
