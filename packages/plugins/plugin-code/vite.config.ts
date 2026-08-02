//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CodePlugin: 'src/CodePlugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
      'CodeCapabilities': 'src/types/CodeCapabilities.ts',
    'CodeEvents': 'src/types/CodeEvents.ts',
    'CodeOperation': 'src/types/CodeOperation.ts',
    'CodeProject': 'src/types/CodeProject.ts',
    'Settings': 'src/types/Settings.ts',
    'SourceFile': 'src/types/SourceFile.ts',
    'Spec': 'src/types/Spec.ts',
},
  jsx: 'react',
  test: { node: true, storybook: true },
});
