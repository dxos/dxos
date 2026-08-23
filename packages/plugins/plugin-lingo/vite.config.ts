//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    LingoPlugin: 'src/LingoPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    extensions: 'src/extensions/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    Analysis: 'src/types/Analysis.ts',
    Language: 'src/types/Language.ts',
    LingoCapabilities: 'src/types/LingoCapabilities.ts',
    LingoEvents: 'src/types/LingoEvents.ts',
    LingoOperation: 'src/types/LingoOperation.ts',
    LingoSettings: 'src/types/LingoSettings.ts',
    Vocabulary: 'src/types/Vocabulary.ts',
    Word: 'src/types/Word.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
