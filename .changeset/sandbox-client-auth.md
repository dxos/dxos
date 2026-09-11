---
'@dxos/plugin-sandbox': minor
---

Sandbox requests now carry the caller's edge credential. `SandboxClient` takes an auth-header provider as its second constructor argument and sets `Authorization` on every request; `createSandboxClient` supplies one that mints a verifiable presentation from the client's identity, re-reading it per request so an identity change is picked up.

This pairs with sandbox-service enforcing authentication and space membership on every route — without it, every sandbox call answers 401.
