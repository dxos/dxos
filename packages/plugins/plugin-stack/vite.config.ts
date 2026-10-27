//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    translations: 'src/translations.ts',
    Stack: 'src/types/Stack.ts',
    StackEvents: 'src/types/StackEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
