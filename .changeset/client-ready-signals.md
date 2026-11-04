---
'@dxos/client': minor
---

`Client` names its two readiness signals: `initialized` / `waitUntilInitialized()` mean the client is ready to use, which a boot-cached client reaches from its cache, while the new `servicesReady` / `waitUntilServicesReady()` mean its services are open and answering, and reject when cached services fail to open or the client is destroyed first. Each marks a milestone (`client.ready`, `client.services-ready`). Breaking: `waitUntilServicesOpen()` is removed in favour of `waitUntilServicesReady()`.
