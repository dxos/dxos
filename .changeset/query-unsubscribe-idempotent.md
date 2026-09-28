---
'@dxos/echo': patch
---

Releasing a query subscription twice no longer stops the query for every other subscriber: the
cached result is shared per query, so a second release used to leave it stopped with a negative
count, and later readers failed with "Query must have at least 1 subscriber". The GitHub markdown
extension, which released its `TaskSet` query once per editor it was mounted in, now holds the
subscription per mounted editor.
