# `package.json`

Two flavors: **community** (your own repo, single bundle) and **monorepo** (multiple `exports`, `workspace:*` deps, moon build).

## Community plugin

```json
{
  "name": "@example/plugin-foo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "imports": {
    "#blueprints": "./src/blueprints/index.ts",
    "#capabilities": "./src/capabilities/index.ts",
    "#components": "./src/components/index.ts",
    "#containers": "./src/containers/index.ts",
    "#meta": "./src/meta.ts",
    "#operations": "./src/operations/index.ts",
    "#types": "./src/types/index.ts"
  },
  "dependencies": {
    "@dxos/app-framework": "0.8.4-main.fcfe5033a5",
    "@dxos/app-toolkit": "0.8.4-main.fcfe5033a5",
    "@dxos/echo": "0.8.4-main.fcfe5033a5",
    "@dxos/operation": "0.8.4-main.fcfe5033a5",
    "@dxos/blueprints": "0.8.4-main.fcfe5033a5",
    "@dxos/react-ui": "0.8.4-main.fcfe5033a5",
    "@dxos/types": "0.8.4-main.fcfe5033a5",
    "@dxos/util": "0.8.4-main.fcfe5033a5",
    "effect": "^3.x",
    "react": "^19.x"
  }
}
```

**All `@dxos/*` deps must be pinned to the Composer host's main dist-tag.** Pin them in lockstep — see [publishing.md](./publishing.md).

The community build emits **one file**: `dist/plugin.mjs` (plus `dist/manifest.json`). No `exports` map needed; Composer dynamically imports the module.

## Monorepo plugin

Multiple `exports` subpaths so other in-repo plugins, the assistant, and the CLI can import slices of your plugin without dragging in React:

```jsonc
{
  "name": "@dxos/plugin-foo",
  "private": true,
  "type": "module",
  "imports": { /* same #aliases as community */ },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs",
      "node": "./dist/lib/node-esm/index.mjs"
    },
    "./blueprints": { "source": "./src/blueprints/index.ts", /* ... */ },
    "./cli":        { "source": "./src/cli/index.ts",        /* ... */ },
    "./operations": { "source": "./src/operations/index.ts", /* ... */ },
    "./types":      { "source": "./src/types/index.ts",      /* ... */ }
  },
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit":   "workspace:*",
    "@dxos/echo":          "workspace:*",
    "effect":              "catalog:",
    "react":               "catalog:"
  }
}
```

- **`workspace:*`** for any in-repo `@dxos/*` package. Never the catalog.
- **`catalog:`** for external packages. Versions live in the root pnpm catalog.
- **`"private": true`** is mandatory for new packages until a trusted publisher is configured.

Each `exports` subpath needs a matching `--entryPoint` in `moon.yml` — see [moon-yml.md](./moon-yml.md).

## CLI entrypoint contract

The `./cli` subpath is the **headless** entrypoint, intended to run under Node (CLI tools, agents, tests).

**`src/cli/` MUST export only:**

- The plugin definition with **schema** + **metadata** + **operations** + **blueprint** modules.
- `types`, `operations`, `blueprints`.

**`src/cli/` MUST NOT import:**

- `react`, `react-dom`, anything from `@dxos/react-ui`.
- The browser variants of capability modules (e.g. the surface-rendering plugin).
- `@dxos/plugin-client` main entrypoint — use `@dxos/plugin-client/cli` instead.

A typical CLI plugin file is a stripped-down twin of the main plugin, omitting `addSurfaceModule` and `addBlueprintDefinitionModule` if the latter pulls UI:

```ts
// src/cli/plugin.ts
import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Foo } from '#types';

export const FooPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({ metadata: { id: Foo.Thing.typename, metadata: { /* createObject only */ } } }),
  AppPlugin.addSchemaModule({ schema: [Foo.Thing] }),
  Plugin.make,
);
```

Why? The CLI runs under Node. React imports break. Tests that rely on the harness use this entrypoint to avoid loading the browser bundle.

## Reference

- `packages/plugins/plugin-chess/package.json` — full monorepo example.
- `packages/plugins/plugin-chess/src/cli/plugin.ts` — CLI plugin.
