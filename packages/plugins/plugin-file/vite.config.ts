//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  registry: true,
  entry: {
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    FileSkill: 'src/skills/FileSkill.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    FileLimits: 'src/types/FileLimits.ts',
    FileCapabilities: 'src/types/FileCapabilities.ts',
    FileEvents: 'src/types/FileEvents.ts',
    FileOperation: 'src/types/FileOperation.ts',
    Settings: 'src/types/Settings.ts',
    StagedUpload: 'src/StagedUpload.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill — for pdf.js that includes the
  // worker — which the 15s browser-mode default cannot cover.
  test: { node: true, storybook: { timeout: 60_000 }, workerd: true },
});
