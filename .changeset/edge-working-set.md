---
'@dxos/echo-client': minor
---

A database can be given a working set that its owner keeps across the databases it starts (`constructDatabase({ workingSet })`), which EDGE's agent process uses so its consecutive operations read each other's writes before the index holds them. As the boot cache does, the database seeds itself from it as it opens and snapshots the documents it holds back to it as it closes (`saveWorkingSet`, also before a call it makes); `absorbWorkingSet` takes the working set again after another database changed it. The working set is a local copy of documents, as the boot cache's rows are; its objects count among the database's unindexed writes, so queries return them before the index holds them, and a query with a limit and no order now gains such objects when the index answer is short of its limit. `WorkingSetService` (with `WorkingSet` and `WorkingSetReport`) is new in `@dxos/protocols`.

A created document whose host wrote a change of its own while the client's first send was in flight (EDGE writes an empty first change) now counts as stored once that send is acknowledged; before, it never did.

Breaking: `WorkingSetRow` moved from `@dxos/echo-client` to `@dxos/protocols`; import it from there.
