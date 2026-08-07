---
'@dxos/observability': patch
---

Harden observability initialization: bound the IP geolocation fetch, run data providers concurrently with per-provider failure isolation, and degrade to a stub extension when a telemetry chunk fails to load instead of rejecting initialization.
