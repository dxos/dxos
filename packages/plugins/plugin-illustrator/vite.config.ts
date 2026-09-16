//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    IllustratorPlugin: 'src/IllustratorPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    util: 'src/util/index.ts',
    Drawing: 'src/types/Drawing.ts',
    LegacySketch: 'src/types/LegacySketch.ts',
    DrawingOperation: 'src/types/DrawingOperation.ts',
    IllustratorCapabilities: 'src/types/IllustratorCapabilities.ts',
    IllustratorError: 'src/types/IllustratorError.ts',
    IllustratorEvents: 'src/types/IllustratorEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
