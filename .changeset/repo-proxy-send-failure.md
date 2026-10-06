---
'@dxos/echo-client': patch
---

A failed document-update batch, such as one that times out while the worker is busy, no longer stops the space's database for the rest of the session. Before, every new object in that space was refused with `RepoClosedError` until the page reloaded. The batch is now logged and retried with backoff.
