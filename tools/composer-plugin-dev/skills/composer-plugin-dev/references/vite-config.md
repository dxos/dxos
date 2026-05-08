# `vite.config.ts` (community plugins)

Community plugins build with Vite + the `composerPlugin` Vite plugin from `@dxos/app-framework/vite-plugin`. The plugin emits a single ES module (`dist/plugin.mjs`) plus the `dist/manifest.json` Composer needs to load it.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { composerPlugin } from '@dxos/app-framework/vite-plugin';

import { meta } from './src/meta';

export default defineConfig({
  plugins: [
    wasm(),
    composerPlugin({
      entry: 'src/plugin.tsx',
      meta,
    }),
    react(),
  ],
});
```

## What it does

- **`composerPlugin`** wraps your entry, injects activation glue, and emits `dist/manifest.json` alongside the bundle. The manifest copies your `meta` (id, name, description, icon, iconHue) and points `moduleFile` at `plugin.mjs`.
- **`wasm()`** is needed because some `@dxos/*` deps (echo, automerge) ship WASM.
- **`react()`** for JSX + Fast Refresh.

## Output

```text
dist/
  plugin.mjs       # ES module, imported by Composer
  manifest.json    # Composer reads this to register the plugin
```

Both files become **GitHub release assets** — see [publishing.md](./publishing.md).

## Local testing

### Dev server (recommended for iteration)

```sh
pnpm dev   # vite dev server, default port 3967
```

In Composer: **Settings → Plugins → Load by URL** → paste `http://localhost:3967/manifest.json`. The dev server synthesizes a dev-flavored manifest pointing at the unbundled source entry; the host imports it directly through Vite's transform pipeline. Edits require a manual reload — cross-origin React Refresh isn't supported, so HMR is off by design.

Dev manifests skip the offline asset cache and the static stylesheet injection step. CSS arrives via runtime `<style>` tags injected by Vite as the module graph evaluates, so no asset enumeration is needed up front.

### Production build (verifies what the registry will serve)

```sh
pnpm build
pnpm preview   # serves dist/ on localhost:4173 (or similar)
```

Paste `http://localhost:4173/manifest.json` into the same dialog. This is the path users hit in production: `assets` is fully enumerated, the host eagerly precaches every entry for offline use, and stylesheets are injected as `<link>` tags at install time.

## Inside the dxos monorepo

In-repo plugins do **not** use Vite. Builds are driven by `moon.yml`'s `compile` task, which calls the workspace TypeScript bundler with one `--entryPoint` per `exports` subpath. Skip this file entirely.
