---
'@dxos/echo': minor
---

A host that cannot produce a requested document now reports it, instead of leaving the load waiting: the document's handle settles `unavailable` and `whenReady()` rejects with `DocumentUnavailableError`. Opening a space whose root document is missing on the data plane therefore fails at once, naming the space and the root, rather than expiring against the caller's timeout; an object whose document is missing reads as unavailable rather than retrying forever, and recovers on its own — becoming readable, with its subscribers woken — if replication delivers the bytes later.
