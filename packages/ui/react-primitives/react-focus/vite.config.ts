//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    // Framework-agnostic subpath: plugins declaring node/workerd environments set the active scope,
    // and `check-module-structure` fails them for transitively importing React.
    'hotkey-store': 'src/hotkey-store.ts',
  },
  jsx: 'react',
  // The hook is only meaningful against a DOM; `Tab` traversal still needs a real browser.
  test: { node: { environment: 'happy-dom' } },
});
