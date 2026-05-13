//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    data: 'src/data.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'solid',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
