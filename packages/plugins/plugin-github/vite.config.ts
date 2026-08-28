//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    GitHubPlugin: 'src/GitHubPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    extensions: 'src/extensions/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    GitHubEvents: 'src/types/GitHubEvents.ts',
    GitHubOperation: 'src/types/GitHubOperation.ts',
    types: 'src/types/index.ts',
  },
  test: { node: true },
});
