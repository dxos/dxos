---
'@dxos/observability': patch
---

Let feedback log uploads target an absolute endpoint, so a native build whose frontend is served from its own origin can reach a deployment that hosts the upload route instead of silently recording every bundle as failed.
