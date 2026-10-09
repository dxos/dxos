---
'@dxos/echo-client': patch
'@dxos/echo-host': patch
---

A one-shot lookup by id, such as `Ref.load` or `db.query(Filter.id(...)).run()`, no longer asks the worker when the working set can load every requested object. Lookups the worker does answer run as soon as they arrive instead of waiting for the query batch in flight.
