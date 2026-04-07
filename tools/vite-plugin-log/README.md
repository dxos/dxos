# @dxos/vite-plugin-log

Vite plugin for DXOS logging in the browser: **dev NDJSON log file sink** (via the HMR WebSocket) and **Rolldown call-site metadata injection** aligned with [`@dxos/swc-log-plugin`](../swc-log-plugin) / [`dx-compile`](../dx-compile).

## Features

1. **Log to file (serve only)** — Forwards `@dxos/log` output from the browser as NDJSON chunks and appends them to a local file (default `app.log`). Injects a small client runtime (`VITE_PLUGIN_LOG_RUNTIME_ID`).
2. **Log meta transform (serve + build)** — When using Vite with Rolldown, prepends `__dxlog_file` and injects metadata objects on `log`, `dbg`, `invariant`, `Context`, etc., using the same rules as the SWC plugin (see `DEFAULT_LOG_META_TRANSFORM_SPEC`).

## Peer dependencies

- `vite` (catalog)
- `@dxos/log`, `@dxos/util` (workspace)
- `rolldown` — optional; required only for the meta `transform` path in the bundler pipeline.

## Usage

```ts
import { DxosLogPlugin } from '@dxos/vite-plugin-log';

export default defineConfig({
  plugins: [
    DxosLogPlugin(),
    // ...
  ],
});
```

### Options (`DxosLogPluginOptions`)

Both sides are **on by default**. Pass `false` to disable.

| Option | Description |
|--------|-------------|
| `logToFile` | `false`, or `{ enabled: true, filename?: string }` (default filename `app.log`). |
| `transform` | `false`, or `{ enabled: true, spec?: LogMetaTransformSpec[], filename?, excludeId? }`. If `spec` is omitted, uses `DEFAULT_LOG_META_TRANSFORM_SPEC` (Composer / `dx-compile` parity). |

Examples:

```ts
// File sink only, no Rolldown meta
DxosLogPlugin({ transform: false });

// Custom meta rules, no dev file
DxosLogPlugin({ logToFile: false, transform: { enabled: true, spec: mySpecs } });

// Custom log path
DxosLogPlugin({ logToFile: { enabled: true, filename: 'my.log' } });
```

### Runtime subpath

The virtual module resolves to the compiled runtime:

- Package export: `@dxos/vite-plugin-log/runtime`

## Development

From repo root:

```bash
moon run vite-plugin-log:test
moon run vite-plugin-log:compile
```

This package uses a **standalone** Vitest config (does not extend the repo `vitest.base.config`) so config loading stays dependency-light.

## TODO

- **`param_index: 'last'`** — Allow transform specs to target the last argument slot (e.g. variadic APIs) instead of only a numeric index.
- **Marker field on meta** — Add an optional marker / tag in the injected metadata object for filtering or tooling (beyond `F`, `L`, `S`, `C`, `A`).
- **Disable call site** — Support disabling the injected call-site helper (`C:(f,a)=>f(...a)`) globally or per spec without turning off the rest of the meta object.
