//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    StudioPlugin: 'src/StudioPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    surfaces: 'src/surfaces.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
      'Artifact': 'src/types/Artifact.ts',
    'Generation': 'src/types/Generation.ts',
    'GenerationService': 'src/types/GenerationService.ts',
    'Lightbox': 'src/types/Lightbox.ts',
    'StudioCapabilities': 'src/types/StudioCapabilities.ts',
    'StudioEvents': 'src/types/StudioEvents.ts',
    'StudioOperation': 'src/types/StudioOperation.ts',
    'Variant': 'src/types/Variant.ts',
},
  jsx: 'react',
  test: { node: true, storybook: true },
});
