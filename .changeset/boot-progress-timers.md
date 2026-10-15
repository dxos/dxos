---
'@dxos/echo': patch
'@dxos/plugin-client': patch
---

Boot-path timeouts fail only when an index migration or rebuild stops making progress, so a long one after an upgrade no longer fails startup. Catch-up and full-text work do not extend them.

- `@dxos/async`: `timeoutUnlessProgress(promise, timeout, progress, err?)` is `asyncTimeout` whose deadline restarts on each `progress` event.
- `@dxos/echo-client`: `EchoClient.indexStatusUpdated` follows the host's index status, and a one-shot query's 20 s index budget restarts each time a migration or rebuild moves on.
- `@dxos/client`: `Client.indexStatus` reads it from the ECHO client, and `Client.indexProgress` fires each time a migration or rebuild moves on.
- `@dxos/plugin-client`: client initialization (30 s) restarts its budget on `Client.indexProgress`, and the boot gate's stall budget restarts only when a migration or rebuild moves on.
- `@dxos/plugin-space`: a space pending open is dropped from the navtree after 60 s without index progress, not 60 s in total.
