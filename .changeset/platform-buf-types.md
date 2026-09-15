---
'@dxos/client': minor
---

Move `SystemService.getPlatform` to buf types

`Platform` — reachable through `client.diagnostics()` — is now the buf message. Its nested enum
flattens: `Platform.PLATFORM_TYPE.X` becomes `Platform_PLATFORM_TYPE.X`, imported from
`@dxos/protocols/buf/dxos/client/services_pb`. Both codecs produce identical wire bytes.

This retires the last `protoMessage` payload in `SystemService`.
