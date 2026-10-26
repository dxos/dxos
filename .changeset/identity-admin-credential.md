---
'@dxos/protocols': minor
---

Add the `IdentityAdmin` credential: an identity makes another identity its admin, one admin per credential, and keeps the grant in its HALO. `createIdentityAdminCredential` issues one, and `verifyIdentityAdmin` checks that the administered identity signed it.
