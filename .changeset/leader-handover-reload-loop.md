---
'@dxos/client-protocol': minor
---

`ClientServicesProvider.reconnected` now carries `{ isOwner }`, and Composer no longer reloads a tab that reconnects to a worker it just became leader of, which ended an endless reload loop between two open tabs.
