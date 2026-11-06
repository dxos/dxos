//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'bin/bundle-plugin': 'src/bin/bundle-plugin.ts',
    'bin/check-bundle': 'src/bin/check-bundle.ts',
    'bin/check-release': 'src/bin/check-release.ts',
    'index': 'src/index.ts',
  },
  // Node builds and checks bundles through a local workerd.
  test: { node: true },
});
