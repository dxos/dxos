---
'@dxos/client-services': patch
---

Fix a device stalling forever when it joins a space and EDGE is its only path to admission: notarization now keeps retrying a transient EDGE failure (e.g. the owner's agent not active yet) instead of giving up after a few seconds.
