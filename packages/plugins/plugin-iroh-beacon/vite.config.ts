//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'IrohBeaconPlugin': 'src/IrohBeaconPlugin.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'transport/index': 'src/transport/index.ts',
    'types': 'src/types.ts',
  },
  jsx: 'react',
  test: { node: true },
});
