//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SequencerPlugin': 'src/SequencerPlugin.tsx',
    'SequencerPlugin.node': 'src/SequencerPlugin.node.ts',
    'SequencerPlugin.workerd': 'src/SequencerPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
