---
'@dxos/plugin-space': patch
---

Modules that require app-shell capabilities (`Client`, attention view state, the app graph) are no longer included in the workerd capability barrels, so a Cloudflare Worker host activates these plugins without `MissingProviderError` dependency-graph failures. Browser and Node hosts are unaffected.
