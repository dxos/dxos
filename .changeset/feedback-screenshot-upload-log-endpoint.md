---
'@dxos/plugin-support': patch
---

Feedback screenshot upload failures now log the image-service endpoint and the blob size alongside
the error. A browser reports every CORS rejection, DNS failure, and offline attempt as the same
opaque `TypeError: Failed to fetch`, so the previous log line could not distinguish them or even
name the host that was refused — diagnosing DX-1203 required re-deriving the endpoint from config.
