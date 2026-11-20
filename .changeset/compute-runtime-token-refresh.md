---
'@dxos/compute-runtime': patch
'@dxos/protocols': patch
---

EDGE functions get `Credential.AccessTokenResolver` on its own, and the resolver can ask EDGE to exchange a managed token's grant again when the provider refused the stored token.
