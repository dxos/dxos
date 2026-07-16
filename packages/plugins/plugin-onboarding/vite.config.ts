//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    OnboardingPlugin: 'src/OnboardingPlugin.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
