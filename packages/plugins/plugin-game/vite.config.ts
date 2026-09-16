//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    GamePlugin: 'src/GamePlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    GameUtil: 'src/util/load-game.ts',
    util: 'src/util/index.ts',
    Game: 'src/types/Game.ts',
    GameCapabilities: 'src/types/GameCapabilities.ts',
    GameEvents: 'src/types/GameEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
