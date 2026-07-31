//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'InboxPlugin': 'src/InboxPlugin.tsx',
    'InboxPlugin.node': 'src/InboxPlugin.node.ts',
    'InboxPlugin.workerd': 'src/InboxPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'testing': 'src/testing/index.ts',
    'testing/node': 'src/testing/node.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  // Many stories here use `withClientProvider` (ECHO/Automerge-backed); per-file isolation
  // re-instantiates that WASM module graph for every story file and exhausts the single headless
  // chromium's WASM memory partway through the suite (`RangeError: ... Out of memory: Cannot
  // allocate Wasm memory for new instance`). Share the module graph across files instead.
  test: { node: true, storybook: { isolate: false } },
});
