//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'LaMetricPlugin': 'src/LaMetricPlugin.ts',
    'plugin': 'src/plugin.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'meta': 'src/meta.ts',
    'LaMetric': 'src/protocol/LaMetric.ts',
    'render': 'src/render/index.ts',
    'transport': 'src/transport/index.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'LaMetricCapabilities': 'src/types/LaMetricCapabilities.ts',
    'types/Settings': 'src/types/Settings.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
