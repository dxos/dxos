---
'@dxos/echo-client': minor
---

A database can be given a working set that its owner keeps across the databases it starts (`constructDatabase({ workingSet })`), which EDGE's agent process uses so its consecutive operations read each other's writes before the index holds them. The database seeds itself from it as it opens, sends each document once the host has stored a write to it or the database loaded it, waits for those sends in `flush` and `close`, and `absorbWorkingSet` takes the objects the owner's other databases wrote. The objects the owner's other databases wrote count among the database's unindexed writes, so queries return them before the index holds them, and a query with a limit and no order now gains such writes when the index answer is short of its limit. `WorkingSetService` (with `WorkingSet` and `WorkingSetReport`) is new in `@dxos/protocols`.

A created document whose host wrote a change of its own while the client's first send was in flight (EDGE writes an empty first change) now counts as stored once that send is acknowledged; before, it never did.

Breaking: `WorkingSetRow` moved from `@dxos/echo-client` to `@dxos/protocols`; import it from there.
