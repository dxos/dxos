//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    DeckPlugin: 'src/DeckPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    DeckSchema: 'src/types/DeckSchema.ts',
    DeckRole: 'src/types/DeckRole.ts',
    DeckCapabilities: 'src/types/DeckCapabilities.ts',
    DeckOperation: 'src/types/DeckOperation.ts',
    Settings: 'src/types/Settings.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
