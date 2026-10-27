//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    QaEvents: 'src/types/QaEvents.ts',
    QaOperation: 'src/types/QaOperation.ts',
    TestCase: 'src/types/TestCase.ts',
    TestPlan: 'src/types/TestPlan.ts',
    TestRun: 'src/types/TestRun.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
