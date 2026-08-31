//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // The hook is only meaningful against a DOM; `Tab` traversal still needs a real browser.
  test: { node: { environment: 'happy-dom' } },
});
