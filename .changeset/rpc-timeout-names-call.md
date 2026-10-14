---
'@dxos/protocols': minor
'@dxos/client': patch
'@dxos/client-protocol': patch
'@dxos/devtools': patch
'@dxos/echo-client': patch
---

Service-RPC timeouts name the call that timed out, e.g. `RPC timeout: DataService.getDocumentHeads`, instead of `RPC timeout: call`.

- `@dxos/protocols`: `runServiceCall` now takes `(runtime, client, tag, payload, options?)` and uses the tag as the timeout label; payload and result types come from the client method. The old effect form is `runServiceEffect(runtime, effect, { label, timeout? })`, with `label` required.
- `@dxos/devtools`: the Indexer card logs a failed heads comparison as a warning instead of reporting an exception for every space on every poll.
