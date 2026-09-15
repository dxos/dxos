---
'@dxos/plugin-space': patch
---

Modules that require app-shell capabilities (`Client`, attention view state, the app graph) are no longer included in the headless capability barrels, so a non-app host such as a worker activates these plugins without `MissingProviderError` dependency-graph failures.
