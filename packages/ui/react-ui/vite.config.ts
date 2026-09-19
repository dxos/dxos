//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  // First package on the React Compiler: these primitives take scalars and render props, and the
  // package depends on no ECHO/client code, so the one hazard the compiler carries — memoizing a
  // component that lies about a reactive read — cannot arise here.
  reactCompiler: true,
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
