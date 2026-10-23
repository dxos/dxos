//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/CallManager': 'src/CallManager.ts',
    'index': 'src/index.ts',
    'CallsPlugin': 'src/CallsPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'translations': 'src/translations.ts',
    'CallOperation': 'src/types/CallOperation.ts',
    'CallsCapabilities': 'src/types/CallsCapabilities.ts',
    'CallsEvents': 'src/types/CallsEvents.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: {
    node: true,
    // The plugin-load smoke test boots a whole client, which only the node project has time for.
    browser: { browsers: ['chromium'], include: ['src/**/*.browser.test.ts'] },
  },
});
