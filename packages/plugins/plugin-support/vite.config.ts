//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SupportPlugin: 'src/SupportPlugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    HelpCapabilities: 'src/types/HelpCapabilities.ts',
    HelpOperation: 'src/types/HelpOperation.ts',
    Settings: 'src/types/Settings.ts',
    Support: 'src/types/Support.ts',
    SupportCapabilities: 'src/types/SupportCapabilities.ts',
    SupportOperation: 'src/types/SupportOperation.ts',
    Tour: 'src/types/Tour.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
