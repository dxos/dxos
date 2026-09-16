//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../vite.base.config.ts';

// A pre-built bundle of hyperformula: its published ESM entry is node-only, so the browser
// build is selected here once rather than in every consuming app.
export default defineConfig({
  // Hand-written `.d.ts` ship next to the sources; there is no TypeScript here to compile.
  declarations: false,
  entry: {
    'hyperformula': 'src/hyperformula.js',
  },
  mainFields: ['browser', 'module', 'main'],
  // The vendored dependency tree, inlined — that is what this package exists to ship.
  bundle: [
    'hyperformula',
    'chevrotain',
    'unorm',
    'tiny-emitter',
    'regexp-to-ast',
  ],
});
