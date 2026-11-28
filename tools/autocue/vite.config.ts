//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../vite.base.config.ts';

export default {
  ...defineConfig({
    entry: {
      index: 'src/index.ts',
      player: 'src/player/index.ts',
      grid: 'src/components/Grid/index.ts',
      ident: 'src/components/Ident/index.ts',
    },
    jsx: 'react',
    test: { node: true },
  }),
  // `public/` is the Remotion project's static folder; it holds a commercially licensed font that must never ship.
  publicDir: false,
};
