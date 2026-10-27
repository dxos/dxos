//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/PreviewEvents': 'src/PreviewEvents.ts',
    'index': 'src/index.ts',
    'PreviewCapabilities': 'src/types/PreviewCapabilities.ts',
    'types': 'src/types/index.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
