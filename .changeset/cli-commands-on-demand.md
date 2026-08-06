---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
---

CLI command modules activate on demand rather than at startup. `AppCapability.commands` now gates on the new `ActivationEvents.CommandsRequested`, fired by whoever is about to build a command tree: `createCliApp` awaits it during boot, and a browser host fires it when a terminal opens. Contributing at startup put every command-bearing plugin on the app's critical path to serve a panel most sessions never open.

Hosts that read `Capabilities.Command` without going through `createCliApp` must fire `ActivationEvents.CommandsRequested` and await it before reading, or the tree comes back empty.
