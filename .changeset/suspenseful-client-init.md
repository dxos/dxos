---
'@dxos/client': minor
---

Client initialization can run forked off app startup: `Client.waitUntilInitialized()` exposes a stable completion signal; `useClient` suspends until initialization completes (per-Surface Suspense boundaries render fallbacks); `ClientProvider` gains a `suspend` mode that provides context immediately instead of rendering the fallback subtree-wide; the HALO client adapters are construction-safe over an uninitialized client (streams open at initialization). The composer client plugin forks `initialize()` so the shell renders while the client boots, and fires the new `ClientEvents.Initialized` for modules that need an initialized client at activation.
