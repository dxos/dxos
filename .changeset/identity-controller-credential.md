---
'@dxos/protocols': minor
---

Add the `IdentityController` credential: an identity grants another identity control of itself, one controller per credential, and keeps the grant in its HALO. `createIdentityControllerCredential` issues one, and `verifyIdentityController` checks that the controlled identity signed it.
