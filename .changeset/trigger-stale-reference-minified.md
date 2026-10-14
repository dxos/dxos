---
'@dxos/compute-runtime': patch
---

A trigger whose operation has no handler, or whose target object is gone, is now parked as a stale reference in production builds. Before, the check compared against the error class's own name, which minification renames, so the trigger failed and re-ran every 30 seconds.
