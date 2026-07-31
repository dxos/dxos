//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'MagazinePlugin': 'src/MagazinePlugin.tsx',
    'MagazinePlugin.workerd': 'src/MagazinePlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'atoms': 'src/atoms/index.ts',
    'testing': 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
