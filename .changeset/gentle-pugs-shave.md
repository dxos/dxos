---
'@dxos/plugin-client': patch
---

Wait for the client to finish initializing before providing `ClientService` to the Effect layer graph, so layers built during boot no longer fail with `Client not initialized.`
