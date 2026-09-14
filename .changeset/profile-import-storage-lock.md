---
'@dxos/worker-framework': patch
'@dxos/client': patch
---

Rewriting a persistent client's OPFS storage from outside the client — importing a profile archive, say — now has a way to wait until the storage is actually free.

A page reload is not enough on its own: the OPFS pool's sync access handles belong to the dedicated worker, which the browser tears down asynchronously after the document goes away, so a write racing that teardown fails with `NoModificationAllowedError`.

`Worker.displace(storageLockKey)` asks whichever worker holds a storage lock to shut down, over the same broadcast protocol `Worker.run` already uses to displace a predecessor. `withPersistentStorage(fn)` (from `@dxos/client/testing`) pairs that with the storage lock itself, running `fn` only once the worker has released it, and aborting after a timeout rather than waiting forever.
