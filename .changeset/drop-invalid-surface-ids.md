---
'@dxos/app-framework': minor
---

Replace `Surface.isAvailable` with `Surface.useIsAvailable`, a hook returning a stable, memoized function. Surfaces and graph extensions with an invalid (non-camelCase) local id are now dropped with a warning instead of throwing and crashing plugin activation.
