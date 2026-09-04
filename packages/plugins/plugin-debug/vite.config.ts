//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    DebugPlugin: 'src/DebugPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    Debug: 'src/types/Debug.ts',
    DebugEvents: 'src/types/DebugEvents.ts',
    DebugNodes: 'src/types/DebugNodes.ts',
    DebugOperation: 'src/types/DebugOperation.ts',
    DebugSurface: 'src/types/DebugSurface.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: {
    node: true,
    // The sample-space stories boot the plugin stack, a client, an identity and a space, then write
    // a whole themed world into it — past the 15s storybook default, which caps the story's own
    // `waitFor` budgets and fails the test before they can resolve.
    storybook: { timeout: 120_000 },
  },
});
