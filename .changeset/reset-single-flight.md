---
'@dxos/client-services': patch
---

Make the storage reset single-flight. The reset chain runs on a detached fiber, so a second
concurrent `SystemService.reset` no longer dies with its caller — it ran the whole
close/wipe/reset sequence again against a stack the first one had already torn down.
