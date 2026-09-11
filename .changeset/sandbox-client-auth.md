---
'@dxos/plugin-sandbox': minor
---

Sandbox requests now carry the caller's edge credential. `SandboxClient` takes an auth-header provider as its second constructor argument and sets `Authorization` on every request; `createSandboxClient` supplies one that mints a verifiable presentation from the client's identity, re-read per request so an identity that arrives after boot, or is swapped, is picked up.

The credential is sent only to an HTTPS endpoint or a loopback host, so a `runtime.services.sandbox.url` pointing at a plain-HTTP worker no longer puts it on the wire in cleartext. Loopback is allowed because that override exists for a local `wrangler dev`, whose traffic never leaves the machine; any other `http://` target gets a warning and unauthenticated requests.

No behaviour change against today's sandbox-service, which serves its routes unauthenticated (`EDGE_CONFIG.sandbox.noAuth`). This is what lets that flag be turned off without breaking these calls.
