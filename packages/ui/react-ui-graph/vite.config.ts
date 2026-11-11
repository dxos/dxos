//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  // Its source holds invalid UTF-8 that Rolldown rejects, so consumers get the patched copy inlined.
  bundle: ['js-clipper'],
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
