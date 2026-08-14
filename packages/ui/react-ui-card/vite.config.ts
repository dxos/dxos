//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  // `happy-dom`, not bare node: the Row hook tests render, matching react-ui's setup.
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
