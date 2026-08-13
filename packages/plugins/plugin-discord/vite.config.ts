//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    DiscordPlugin: 'src/DiscordPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    DiscordTargetOptions: 'src/types/DiscordTargetOptions.ts',
    DiscordEvents: 'src/types/DiscordEvents.ts',
    DiscordOperation: 'src/types/DiscordOperation.ts',
    types: 'src/types/index.ts',
  },
  test: { node: true },
});
