---
'@dxos/client-services': patch
---

Replace the `ServiceContext` orchestrator class with an effect-native service lifecycle: the client services host now drives open/close and identity flow directly over the composed layer stack and exposes the readiness/identity surface to RPC handlers via `ClientLifecycleService`. Every service the host exposes is now built by an Effect layer — `SwarmNetworkManagerLayer` and a `TransportFactoryService` tag with `RtcTransportFactoryLayer` (`@dxos/network-manager`), `WebsocketSignalManagerLayer` / `EdgeSignalManagerLayer` (`@dxos/messaging`), and `EdgeConnectionLayer` / `EdgeHttpClientLayer` (`@dxos/edge-client`) — composed into the host's runtime instead of being constructed imperatively.
