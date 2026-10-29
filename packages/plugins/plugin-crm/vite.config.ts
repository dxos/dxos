//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/CrmSkill': 'src/skills/crm/CrmSkill.ts',
    'index': 'src/index.ts',
    'skills': 'src/skills/index.ts',
    'operations': 'src/operations/index.ts',
    'sources': 'src/sources/index.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'CrmEvents': 'src/types/CrmEvents.ts',
    'CrmOperation': 'src/types/CrmOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
