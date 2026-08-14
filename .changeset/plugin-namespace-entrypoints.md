---
'@dxos/app-graph': minor
'@dxos/plugin-markdown': minor
---

Replace each plugin's `./plugin` entrypoint with an `XPlugin` namespace. **Breaking:** import the plugin from its own subpath and construct it with `make` — `import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin'; ChessPlugin.make()` in place of `import { ChessPlugin } from '@dxos/plugin-chess/plugin'; ChessPlugin()`. Plugin metadata is available as `XPlugin.meta` without loading the plugin body. **Breaking:** `@dxos/plugin-graph` no longer re-exports `@dxos/app-graph`; import `Graph`, `GraphBuilder`, `Node` and `NodeMatcher` from `@dxos/app-graph`, which now publishes them as per-namespace subpaths.
