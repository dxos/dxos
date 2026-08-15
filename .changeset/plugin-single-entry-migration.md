---
'@dxos/plugin-markdown': patch
---

Every `@dxos/plugin-*` package now authors a single canonical `plugin.ts(x)` and `capabilities/index.ts`, annotated with `environments` where a module diverges by runtime, instead of hand-maintained `plugin.node.ts`/`plugin.workerd.ts`/`capabilities/{node,workerd}.ts` variants. The `dx-plugin gen` tool (shipped with `@dxos/app-framework`) generates the per-environment barrels from those annotations.

This migration also fixed two real drift bugs the hand-maintained variants had introduced: `plugin-client` and `plugin-routine`'s node-environment `OperationHandler` now activates on the `Startup` wave, matching browser and workerd, instead of silently defaulting to `Idle`.
