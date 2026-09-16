//
// Copyright 2026 DXOS.org
//

import { builtinModules } from 'node:module';

import { defineConfig } from '../../../vite.base.config.ts';

const config = defineConfig({
  entry: {
    plugin: 'src/plugin.ts',
  },
  // Runs in the Node runtime the Stream Deck app spawns; skip the browser node-std polyfills.
  nodeTarget: true,
  test: { node: true },
});

// `ws` and other CJS dependencies require builtins unprefixed (`stream`, `net`, …), so both spellings
// have to be recognised — bundling them yields `undefined` named exports at runtime.
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

// The Stream Deck application loads `bin/plugin.mjs` from the assembled `.sdPlugin` directory, which
// has no `node_modules`, so unlike a library build this one must be self-contained. Only the Node
// builtins the runtime provides stay external.
export default {
  ...config,
  // Resolve as Node, not as a browser: `ws` (used by both the bridge server and the Elgato SDK)
  // ships a `browser` build that throws on construction, and vite prefers that field by default.
  resolve: {
    ...config.resolve,
    conditions: ['node', 'import', 'module', 'default'],
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
  },
  build: {
    ...config.build,
    rollupOptions: {
      ...config.build?.rollupOptions,
      external: (id: string) => builtins.has(id),
      output: {
        ...config.build?.rollupOptions?.output,
        // Bundled CJS dependencies (`ws`) `require()` the externalized builtins, and an ESM module
        // has no `require`. Rolldown's shim defers to one in scope, so provide it.
        banner: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
      },
    },
  },
};
