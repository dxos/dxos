---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

`dx` no longer waits for the ECHO client at startup. A command waits only if it uses the client, so `--help` and client-free commands such as `dx registry publish --upload-only --edge-url <url>` work even when the client cannot initialize. A command that needs the client now fails with the real initialization error instead of `UnknownError`. `@dxos/client` adds `ClientInitialization` and `initializedClient` for hosts that hand out the client before it has initialized, and `@dxos/cli-util` adds the `ClientFree` command annotation. Breaking: `ClientPlugin`'s `awaitInitialization` option is removed; the plugin now always contributes `ClientInitialization` alongside the uninitialized `ClientService`.
