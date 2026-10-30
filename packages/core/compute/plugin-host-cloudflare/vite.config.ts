//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'bin/bundle-plugin': 'src/bin/bundle-plugin.ts',
    'bin/check-bundle': 'src/bin/check-bundle.ts',
    'bin/check-release': 'src/bin/check-release.ts',
    'bundle': 'src/bundle/index.ts',
    'bundler': 'src/bundler/index.ts',
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
  },
  // Node runs the bundler and drives releases through a local workerd; the host itself is tested inside workerd.
  test: { node: true, workerd: true },
});
