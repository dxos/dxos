# @dxos/plugin-calls

## 0.12.0

### Patch Changes

- 0280a6a: Cut app startup cost by loading feature code on demand rather than at boot.

  Activation: the coarse `DeferredStartup` event is replaced by per-plugin start events (`<pluginKey>.event.start`, built with `ActivationEvent.pluginStart`). A plugin's own start event now fires when one of its modules contributes a `ReactSurface` — the feature being rendered is the demand signal — so an unvisited feature's contributions never load. Contributions no surface can gate ride the feature they belong to instead: app-graph builders default to the graph plugin's start event, skill definitions to the assistant's, and cross-plugin contributions (markdown extensions, connectors, game variants) to the consuming plugin's. React surfaces activate on their declared roles.

  Client: initialization can run forked off app startup. `Client.waitUntilInitialized()` exposes a stable completion signal, `useClient` suspends until it resolves, `ClientProvider` gains a `suspend` mode that provides context immediately instead of rendering the fallback subtree-wide, and the HALO adapters are construction-safe over an uninitialized client.

  Bundle: `runDedicatedWorker` moves to `@dxos/client/worker` so the worker-side service runtime (client-services, sqlite, hypercore) is no longer statically reachable from main-thread bundles; the in-process host (`fromHost`) and the RTC ice provider load on demand. A new engine-free `@dxos/compute-hyperformula/types` subpath lets schema and operation definitions use cell-address helpers without loading HyperFormula.

  Breaking: `ActivationEvents.DeferredStartup` and `ActivationEvents.SkillsRequested` are removed; worker entrypoints importing `runDedicatedWorker` from the root must import it from `@dxos/client/worker`; and a plugin's React surface must declare the roles it serves to be activated.

- Updated dependencies [0280a6a]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [3958355]
- Updated dependencies [557e243]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [557e243]
- Updated dependencies [678ba58]
- Updated dependencies [0280a6a]
  - @dxos/app-framework@1.0.0
  - @dxos/app-toolkit@1.0.0
  - @dxos/echo@1.0.0
  - @dxos/react-ui@1.0.0
  - @dxos/client@1.0.0
  - @dxos/plugin-client@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/devtools@1.0.0
  - @dxos/types@1.0.0
  - @dxos/react-ui-components@1.0.0
  - @dxos/react-ui-audio@1.0.0
  - @dxos/config@1.0.0
  - @dxos/async@1.0.0
  - @dxos/av@1.0.0
  - @dxos/context@1.0.0
  - @dxos/debug@1.0.0
  - @dxos/display-name@1.0.0
  - @dxos/halo@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0
  - @dxos/protocols@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/av@0.11.1
- @dxos/client@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/devtools@0.11.1
- @dxos/display-name@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/halo@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/random@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-audio@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-graph@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [fe63f19]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [41141d8]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/config@0.11.0
  - @dxos/devtools@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/av@0.11.0
  - @dxos/react-ui-audio@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/random@0.11.0
  - @dxos/display-name@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
