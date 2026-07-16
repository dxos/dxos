//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'app-framework/AppActivationEvents': 'src/app-framework/AppActivationEvents.ts',
    'echo/Query': 'src/echo/Query.ts',
    'ui': 'src/ui/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
