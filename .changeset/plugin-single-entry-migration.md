---
'@dxos/app-framework': minor
'@dxos/plugin-markdown': patch
---

Single-entry plugin authoring: `Plugin.addModule` skips `undefined` (headless barrels stub excluded modules), module specs and makers accept an `environments` annotation, and `@dxos/app-framework` ships a `dx-plugin` bin that generates the per-environment `#capabilities` barrels (`src/capabilities/gen/`) and syncs the package.json condition map from those annotations.

Every `@dxos/plugin-*` package now authors a single canonical `plugin.ts(x)` and `capabilities/index.ts` on this pattern, instead of hand-maintained `plugin.node.ts`/`plugin.workerd.ts`/`capabilities/{node,workerd}.ts` variants. This migration also fixed two real drift bugs the hand-maintained variants had introduced: `plugin-client` and `plugin-routine`'s node-environment `OperationHandler` now activates on the `Startup` wave, matching browser and workerd, instead of silently defaulting to `Idle`.

`@dxos/react-ui-assistant` gains a `./translations` export so consumers can take its translation resources without pulling the React root barrel.
