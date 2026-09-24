---
'@dxos/app-framework': patch
'@dxos/compute-runtime': minor
---

`ProcessOperationInvoker` takes an `AmbientContext`: services every invocation sees beneath the caller's context. The app binds its capability and plugin managers there, so a handler that reads them as optional ambient services (because EDGE has none) finds them whether it was invoked from an effect that provided them or from `invokePromise`.
