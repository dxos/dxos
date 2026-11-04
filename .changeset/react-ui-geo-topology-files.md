---
'@dxos/react-ui-geo': patch
---

`loadTopology('50m')` and `loadTopology('10m')` now fetch the topology from `@dxos/react-ui-geo/data/raw/*.json` instead of importing a bundled module, so the package's `dist/` no longer carries 9 MB of map data. Consumers need a bundler that resolves `?url` imports, such as Vite. `loadTopology('110m')` is unchanged.
