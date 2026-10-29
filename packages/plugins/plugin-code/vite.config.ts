//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    sync: 'src/sync/index.ts',
    translations: 'src/translations.ts',
    CodeCapabilities: 'src/types/CodeCapabilities.ts',
    CodeEvents: 'src/types/CodeEvents.ts',
    CodeOperation: 'src/types/CodeOperation.ts',
    CodeProject: 'src/types/CodeProject.ts',
    Settings: 'src/types/Settings.ts',
    SourceFile: 'src/types/SourceFile.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
