---
'@dxos/echo': patch
'@dxos/plugin-client': patch
---

Boot-path timeouts fail only when an index migration or rebuild stops making progress, so a long one after an upgrade no longer fails startup. Catch-up and full-text work do not extend them.

- `@dxos/async`: `timeoutUnlessProgress(promise, timeout, progress, err?)` is `asyncTimeout` whose deadline restarts on each `progress` event.
- `@dxos/echo-client`: `EchoClient.indexStatusUpdated` follows the host's index status, and a one-shot query's 20 s index budget restarts on each status reporting a migration or rebuild.
- `@dxos/client`: `Client.indexStatus` reads it from the ECHO client.
- `@dxos/plugin-client`: client initialization (30 s) restarts its budget on each status reporting a migration or rebuild.
- `@dxos/plugin-space`: a space pending open is dropped from the navtree after 60 s without index progress, not 60 s in total.
