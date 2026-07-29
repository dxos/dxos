---
'@dxos/plugin-client': patch
---

Fix `dx account login --method email` to handle the hub's `needsIdentity` response, creating a local identity and retrying so the login completes instead of waiting for a token that never arrives.
