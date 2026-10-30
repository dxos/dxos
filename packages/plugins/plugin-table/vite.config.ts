//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    TableSkill: 'src/skills/TableSkill.ts',
    TableOperationHandlerSet: 'src/operations/TableOperationHandlerSet.ts',
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    TableEvents: 'src/types/TableEvents.ts',
    TableOperation: 'src/types/TableOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
