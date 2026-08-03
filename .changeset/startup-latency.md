---
'@dxos/client': minor
'@dxos/plugin-calls': patch
---

Cut app startup cost by loading feature code on demand rather than at boot.

Activation: the coarse `DeferredStartup` event is replaced by per-plugin start events (`<pluginKey>.event.start`, built with `ActivationEvent.pluginStart`). A plugin's own start event now fires when one of its modules contributes a `ReactSurface` — the feature being rendered is the demand signal — so an unvisited feature's contributions never load. Contributions no surface can gate ride the feature they belong to instead: app-graph builders default to the graph plugin's start event, skill definitions to the assistant's, and cross-plugin contributions (markdown extensions, connectors, game variants) to the consuming plugin's. React surfaces activate on their declared roles.

Client: initialization can run forked off app startup. `Client.waitUntilInitialized()` exposes a stable completion signal, `useClient` suspends until it resolves, `ClientProvider` gains a `suspend` mode that provides context immediately instead of rendering the fallback subtree-wide, and the HALO adapters are construction-safe over an uninitialized client.

Bundle: `runDedicatedWorker` moves to `@dxos/client/worker` so the worker-side service runtime (client-services, sqlite, hypercore) is no longer statically reachable from main-thread bundles; the in-process host (`fromHost`) and the RTC ice provider load on demand. A new engine-free `@dxos/compute-hyperformula/types` subpath lets schema and operation definitions use cell-address helpers without loading HyperFormula.

Breaking: `ActivationEvents.DeferredStartup` and `ActivationEvents.SkillsRequested` are removed; worker entrypoints importing `runDedicatedWorker` from the root must import it from `@dxos/client/worker`; and a plugin's React surface must declare the roles it serves to be activated.
