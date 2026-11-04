---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

`dx` initializes the ECHO client only when a command first uses it. A command that never uses the client, such as `dx plugin list` or `dx registry publish --upload-only --edge-url <url>`, no longer waits for initialization or fails with it. A command that does use the client fails with the real initialization error. Breaking: `ClientService` now provides a handle rather than the client; resolve the client with `yield* ClientService.client`, which waits until it has initialized. `ClientService.layer` stays eager; the new `ClientService.layerLazy` initializes the client on first use. `ClientPlugin` gains `initializeOnUse`, which the CLI sets, and loses `awaitInitialization`.
