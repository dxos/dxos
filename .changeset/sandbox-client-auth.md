---
'@dxos/plugin-sandbox': minor
---

Sandbox requests now carry the caller's edge credential. `SandboxClient` takes an auth-header provider as its second constructor argument and sets `Authorization` on every request; `createSandboxClient` supplies one that mints a verifiable presentation from the client's identity, re-reading it per request so an identity change is picked up.

No behaviour change against today's sandbox-service, which serves its routes unauthenticated (`EDGE_CONFIG.sandbox.noAuth`). This is what lets that flag be turned off without breaking these calls.
