//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    // The dialect without the renderer, so a module that only reads slide markdown (a schema, a migration) does not
    // pull React and the syntax highlighter into its import chain.
    dialect: 'src/dialect.ts',
    editor: 'src/editor/index.ts',
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
