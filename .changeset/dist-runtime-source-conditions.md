---
'@dxos/client-services': patch
---

Packages whose sources are not safe to bundle for the browser no longer publish a `source` export condition: `@dxos/client-services`, `@dxos/config`, `@dxos/lock-file`, `@dxos/network-manager`, `@dxos/observability`, `@dxos/random-access-storage` and `@dxos/teleport`.

Default resolution is unchanged — these packages already resolved to their built `dist` for ordinary consumers, and their entry points, types and runtime behaviour are the same. Only resolution under `--conditions=source` changes: it now yields the built output instead of the TypeScript sources in the published `src` directory, so node, bun and Vite all agree on which packages are consumed from source.
