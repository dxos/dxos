//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SheetPlugin': 'src/SheetPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'operations/node': 'src/operations/node.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'SheetRange': 'src/types/SheetRange.ts',
    'SheetUtil': 'src/types/SheetUtil.ts',
    'skills': 'src/skills/index.ts',
    'Sheet': 'src/types/Sheet.ts',
    'SheetCapabilities': 'src/types/SheetCapabilities.ts',
    'SheetEvents': 'src/types/SheetEvents.ts',
    'SheetOperation': 'src/types/SheetOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
