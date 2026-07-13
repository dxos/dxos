---
'@dxos/client-services': patch
---

Replace the `ServiceContext` orchestrator class with an effect-native service lifecycle: the client services host now drives open/close and identity flow directly over the composed layer stack and exposes the readiness/identity surface to RPC handlers via `ClientLifecycleService`.
