---
'@dxos/protocols': minor
'@dxos/edge-compute': minor
'@dxos/client': minor
'@dxos/plugin-client': minor
'@dxos/app-framework': patch
'@dxos/plugin-agent': patch
---

Plugin bundles on EDGE now get what operation-service gives a handler. `PluginProtocol.InvocationScope` carries the request context (conversation, origin, caller, trace sink and pids, cancellation, test id seed), the services only EDGE holds (`services`, a `ServiceHost` stub with service descriptors) and other plugins' operations (`operations`, an `OperationHost` stub). The protocol is versioned: `PluginProtocol.PROTOCOL_VERSION` is 2, `isSupported` and `scopeFor` let EDGE speak each bundle's version, `Catalog.protocolVersion` records it, and the main module `PluginLoader.workerCode` generates answers `protocolVersion()` from the vendored host (1 for a host that predates versioning).

EDGE's plugin loader ships only the modules that run on workerd, leaving out browser-only bodies and the UI packages they vendor, and a plugin chunk that declares its own top-level `Map` (such as plugin-map's ECHO type) now loads instead of failing with "is not a constructor".

Agent operations declare the types they write but plugin-agent does not register, so they run on EDGE, where a plugin bundle registers only its own types; before this, `agent.create` on EDGE failed with `Schema not registered Schema: org.dxos.type.instructions`.

`dx` initializes the ECHO client only when a command first uses it, so a command that never uses it (such as `dx plugin list` or `dx registry publish --upload-only --edge-url <url>`) no longer waits for or fails with initialization. Breaking: `ClientService` now provides a handle rather than the client; resolve the client with `yield* ClientService.client`. `ClientService.layer` stays eager; the new `ClientService.layerLazy` initializes the client on first use. `ClientPlugin` gains `initializeOnUse`, which the CLI sets, and loses `awaitInitialization`.
