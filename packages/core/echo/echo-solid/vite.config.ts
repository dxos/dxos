//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'solid',
  test: { node: { environment: 'happy-dom' }, browser: 'chromium' },
});
