---
'@dxos/plugin-space': patch
---

Modules that require app-shell capabilities (`Client`, attention view state, the app graph) are excluded from the generated capability barrels, so a non-browser host activates these plugins without `MissingProviderError` dependency-graph failures. This covers Node as well as workerd: a Node host no longer activates `NavigationTargetResolver`, `AppGraphBuilder` or `CompanionChatProvisioner`. The browser is unaffected — it resolves the plugin's own `capabilities/index.ts` rather than a generated barrel.
