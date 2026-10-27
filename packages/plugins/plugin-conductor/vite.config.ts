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
    ConductorEvents: 'src/types/ConductorEvents.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
