---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Make the published `@dxos/cli` runnable, and keep React out of node and bun builds.

`@dxos/cli@0.10.0` could not execute at all once installed from npm. Nothing marked `external` in
the compiled binary can resolve at runtime (Bun's embedded filesystem has no `node_modules`), so the
externals are gone and `esbuild-wasm`'s WASM is inlined; the `@dxos/node-std` shims resolve to node
builtins, since Bun miscompiles `export * from 'node:<mod>'`; `@automerge/automerge-subduction` uses
its self-contained `web` entry rather than the `node` one that reads a sibling file; the platform
binary keeps its executable bit through publishing; and the pinned bun no longer leaks `--smol` into
`process.argv`. Persistent SQLite on bun also now creates its parent directory, which any `dx`
command needed on a machine with a stored profile but no data root.

The binary also contained React, react-dom and the whole `react-ui` graph. `Capability.lazy`,
`OperationHandlerSet.lazy` and `React.lazy` defer evaluation but not bundling, so plugin barrels that
merely listed a React surface pulled it into every non-browser consumer: the plugins with a node
variant now have node-conditioned `#capabilities`, and `plugin-sheet` a node-conditioned
`#operations`. Headless code no longer reaches for React packages — `@effect-atom/atom` instead of
`@effect-atom/atom-react` wherever only `Atom`/`Registry`/`Result` are used, and `@dxos/client/*`
instead of `@dxos/react-client/*`. `@dxos/ui-editor/headless` is a new UI-free entrypoint for the
editor helpers operation handlers need.

Breaking:

- `formatForDisplay` and `formatForEditing` move from `@dxos/react-ui-form` to `@dxos/schema`.
- `renderByline` and `BylineIdentity` move from `@dxos/react-ui-transcription` to
  `@dxos/plugin-transcription`.
- The icon list moves from `@dxos/react-ui-pickers/icons` to `@dxos/ui-types`, and that subpath is
  removed; `hues` moves from `@dxos/ui-theme` to `@dxos/ui-types` beside `ChromaticPalette`.
- `@dxos/plugin-graph` no longer exports its React hooks from the package root — import them from
  `@dxos/plugin-graph/hooks`.
- `@dxos/plugin-deck` and `@dxos/plugin-navtree` are browser-only: `#plugin` no longer resolves a
  `node` or `workerd` condition.
