//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'KanbanPlugin': 'src/KanbanPlugin.tsx',
    'KanbanPlugin.node': 'src/KanbanPlugin.node.ts',
    'KanbanPlugin.workerd': 'src/KanbanPlugin.workerd.ts',
    'skills/index': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, browser: 'chromium', storybook: true },
});
