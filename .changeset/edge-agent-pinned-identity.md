---
'@dxos/client-services': patch
---

Stop admitting an EDGE agent into an identity that replaced the agent's owner while the agent was being created (joining another identity from this device), which left an `AuthorizedDevice` credential in that identity's HALO that EDGE could never accept.
