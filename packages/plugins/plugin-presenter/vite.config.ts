//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    PresenterPlugin: 'src/PresenterPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    testing: 'src/testing.ts',
    PresenterCapabilities: 'src/types/PresenterCapabilities.ts',
    PresenterEvents: 'src/types/PresenterEvents.ts',
    PresenterOperation: 'src/types/PresenterOperation.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
