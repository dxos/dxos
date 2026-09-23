---
'@dxos/echo-client': patch
---

`RepoProxy.find`/`create` now throw a typed `RepoClosedError` instead of failing an invariant when the proxy is closing or closed, so work that outlives the client (query hydration, a graph rebuild on a timer) can recognise the teardown and abandon quietly.
