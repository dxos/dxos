---
'@dxos/client-services': patch
---

A space member without permission to manage members no longer fails to process the space's delegated invitations: the invitation credential is recorded and reaches credential processors on every member's device, and the member's role sweep and space-list update run when the space becomes ready.
