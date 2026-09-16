---
'@dxos/client-services': patch
---

Fix a device stalling forever when it joins a space and EDGE is its only path to admission: notarization now follows EDGE's `Retry-After` for a retryable failure (e.g. the owner's agent not admitted yet) instead of giving up after a few seconds, and stops asking when EDGE rejects the credential outright.
