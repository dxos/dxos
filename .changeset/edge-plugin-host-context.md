---
'@dxos/protocols': minor
'@dxos/edge-compute': minor
---

Plugin bundles on EDGE now get what operation-service gives a handler. `PluginProtocol.InvocationScope` carries the request context (conversation, origin, caller, trace sink and pids, cancellation, test id seed), the services only EDGE holds (`services`, a `ServiceHost` stub with service descriptors) and other plugins' operations (`operations`, an `OperationHost` stub). The protocol is versioned: `PluginProtocol.PROTOCOL_VERSION` is 2, `isSupported` and `scopeFor` let EDGE speak each bundle's version, `Catalog.protocolVersion` records it, and the main module `PluginLoader.workerCode` generates answers `protocolVersion()` from the vendored host (1 for a host that predates versioning).
