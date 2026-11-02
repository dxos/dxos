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
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    SheetRange: 'src/types/SheetRange.ts',
    SheetUtil: 'src/types/SheetUtil.ts',
    skills: 'src/skills/index.ts',
    LegacySheet: 'src/types/LegacySheet.ts',
    Sheet: 'src/types/Sheet.ts',
    SheetCapabilities: 'src/types/SheetCapabilities.ts',
    SheetEvents: 'src/types/SheetEvents.ts',
    SheetOperation: 'src/types/SheetOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true, workerd: true },
});
