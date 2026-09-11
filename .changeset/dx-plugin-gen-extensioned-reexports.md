---
'@dxos/app-framework': patch
---

Fix `dx-plugin gen` silently dropping a capability from every generated per-environment barrel (`src/capabilities/gen/<env>.ts`) — neither as a real export nor as its `undefined` stub — when its declaration was reached through an already-extensioned relative re-export (e.g. `export { X } from './x/index.ts'` or `export * from './x/index.ts'`). `resolveRelativeModule` always appended a resolution extension to the specifier, so an already-extensioned one resolved to a nonexistent path (`index.ts.ts`) and the barrel parse silently gave up on that branch. This broke plugin loading outright for any capability affected this way (confirmed on `plugin-space`'s `NavigationHandler` and `plugin-connector`'s `Coordinator`, also present in `plugin-client` and `plugin-file-system`) — the CLI failed with `LazyPluginError`/`SyntaxError: Export named 'X' not found` for every command, since plugin manager initialization eagerly resolves every plugin.
