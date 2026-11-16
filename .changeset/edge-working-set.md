---
'@dxos/echo-client': minor
---

A database can be given a working set that its owner keeps across the databases it starts (`constructDatabase({ workingSet })`), which EDGE's agent process uses so its consecutive operations read each other's writes before the index holds them. The database seeds itself from it as it opens, sends each document once the host has stored a write to it or the database loaded it, waits for those sends in `flush` and `close`, and `absorbWorkingSet` takes the objects the owner's other databases wrote. `DatabaseImpl.noteUnindexedWrites` counts objects another client wrote among the database's unindexed writes, so queries return them before the index holds them, and a window with no order now admits such writes when the index answer is short of its limit. `WorkingSetRow` moved from `@dxos/echo-client` to `@dxos/protocols`, beside the new `WorkingSet`, `WorkingSetReport` and `WorkingSetService`.
