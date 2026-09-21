---
'@dxos/client-services': minor
'@dxos/client-protocol': minor
'@dxos/protocols': patch
'@dxos/rpc': minor
'@dxos/client': patch
---

Client service RPCs are registered with an `RpcRouter` at the bottom of the client-services layer stack instead of being enumerated per connection.

`RpcRouter` is now a registry of rpc groups that any number of transports serve: `RpcRouter.layer` provides it with no transport, `RpcRouter.layerTransport` attaches the ambient `RpcServer.Protocol`, and a group registered before or after a transport is attached is served either way. A registration can carry an in-process client, and `RpcRouter.client` merges those into one tag-keyed surface with no wire hop.

Each service registers itself: `RegisterService(rpc, tag)` (`@dxos/client-protocol`) is a layer requiring the service's handler tag and the router, kept separate from the layer that creates the handler. `ServiceStack` is now the whole stack — the components with the RPC services over them — so the per-connection lists are gone along with `layerClientServicesServer`, `layerHandlersFromTag` and `handlersFromStack`: a worker session builds `RpcRouter.layerTransport` over its protocol, and in-process consumers (`LocalClientServices`, diagnostics, tests) source their handlers from the router through `makeClientServicesRpcFromRouter`. `SystemService` depends on the router rather than on every other service tag.

Also in this change:

- One open/close state machine backs every transport server in `@dxos/client-protocol`'s `Rpc`, so concurrent opens cannot build two runtimes and a close during startup disposes the runtime that startup created.
- `normalizeHandlers` resolves each method per call, so an implementation replaced after registration serves subsequent requests.
- `ServiceContext.services` (test builder) is replaced by the scoped `ServiceContext.rpc`, and `TestBuilder.createClientServer` returns an `Rpc.GroupServer` served off the host's router.
