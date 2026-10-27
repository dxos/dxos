---
'@dxos/client-services': patch
---

Fix persistent invitations on restart: a saved invitation is hosted again once its space is ready instead of failing with `AuthorizationError: No member management permission.`, and a redeemed single-use invitation is no longer kept in storage.
