//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    MapPlugin: 'src/MapPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    meta: 'src/meta.ts',
  },
  jsx: 'solid',
  // `vite-plugin-solid` adds the `browser` export condition under vitest, so
  // `@dxos/app-framework/testing` resolves through `@dxos/react-ui` to `@dxos/lit-ui`, whose
  // custom elements touch `HTMLElement` at module scope. Solid would have picked jsdom itself
  // had the node project not named an environment.
  test: { node: { environment: 'jsdom' } },
});
