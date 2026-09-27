---
'@dxos/client': minor
'@dxos/plugin-debug': minor
---

A client can now hold proxies of its documents instead of Automerge replicas, so a browser tab loads no Automerge. Set `runtime.client.documentMode` to `PROXY`, or build with `DX_ECHO_DOCUMENT_MODE=proxy`. The client's services then check and store each change the tab writes, and heads, history, branches and cursors behave as they do on a replica. `runtime.client.proxyIndexReads` (`DX_ECHO_PROXY_INDEX_READS`) also shows objects from the services' index until the tab writes to them. Replicas stay the default, and the debug plugin's settings gain a picker for the mode.

New API: `documentModeFromConfig` in `@dxos/client`; `subscribeProxy`, `updateProxySubscription` and `submit` on `DataService`; `documentCopies` on `QueryService`; an `indexCopies` option on `EchoHost`; and the `@dxos/client-services/storage` entry, which creates storage without loading the package root. Code that calls Automerge on ECHO documents imports `@dxos/automerge-proxy/Automerge`, which works on replicas and proxies alike.
