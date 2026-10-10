---
'@dxos/echo-client': patch
'@dxos/echo-host': patch
---

A one-shot lookup by id, such as `Ref.load` or `db.query(Filter.id(...)).run()`, no longer queries the worker's index for objects the working set can load, and asks it only for the ids the working set did not return. Lookups the worker does answer run as soon as they arrive instead of waiting for the query batch in flight.
