---
'@dxos/plugin-client': patch
---

CLI commands no longer fail with `Client not initialized` against a profile that already holds an identity. `client.initialize()` is forked off startup so the app's boot waterfall is not blocked, but a CLI command body runs straight through and reached `client.halo` before the fork landed — `dx halo identity`, `dx device list`, `dx halo keys` and `dx device info` failed outright, and `dx account login` reported a missing client instead of its "Already logged in" guard.

`ClientPlugin` gains `awaitInitialization` (default `false`), which gates the contributed `ClientService` on initialization. The CLI opts in; the app keeps the forked, non-blocking behaviour.
