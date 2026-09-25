//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ComputerPlugin': 'src/ComputerPlugin.ts',
    'plugin': 'src/plugin.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    // Browser-safe wire contract and fetch client for the dev-server route.
    'shell': 'src/shell/index.ts',
    // Node-only: mounts the route in a vite dev server. Never reachable from a browser bundle.
    'vite-plugin': 'src/vite-plugin/index.ts',
    'ComputerOperation': 'src/types/ComputerOperation.ts',
    'types': 'src/types/index.ts',
  },
  test: { node: true },
});
