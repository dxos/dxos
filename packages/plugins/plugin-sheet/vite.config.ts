//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SheetPlugin': 'src/SheetPlugin.tsx',
    'SheetPlugin.node': 'src/SheetPlugin.node.ts',
    'SheetPlugin.workerd': 'src/SheetPlugin.workerd.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
    'skills/index': 'src/skills/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
