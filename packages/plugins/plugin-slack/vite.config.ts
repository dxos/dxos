//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SlackPlugin: 'src/SlackPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    SlackChannel: 'src/types/SlackChannel.ts',
    SlackEvents: 'src/types/SlackEvents.ts',
    SlackOperation: 'src/types/SlackOperation.ts',
    types: 'src/types/index.ts',
  },
  test: { node: true },
});
