//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'MagazinePlugin': 'src/MagazinePlugin.tsx',
    'MagazinePlugin.workerd': 'src/MagazinePlugin.workerd.ts',
    'skills/index': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
    'atoms/index': 'src/atoms/index.ts',
    'testing': 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
