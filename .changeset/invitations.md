---
'@dxos/client-services': patch
---

Fix invitations failing when the guest's introduce arrived before the host marked the connection connected, and hanging when the first connection closed before the invitation flow started.
