---
'@dxos/app-framework': minor
'@dxos/plugin-markdown': patch
---

Cut the app's eager startup module graph by two thirds (lazy plugin stubs, operation handler-set
splits, subpath imports for `@dxos/credentials/seedphrase` and `@dxos/client/version`), add an
opt-in two-wave plugin startup (`ManagerOptions.deferred` + `PluginManager.enableDeferred`, `useApp`
`defer` predicate) that activates non-core plugins after first paint, and create plugin-calls
placeholder media tracks at call join instead of activation.
