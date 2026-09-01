//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  // `./ai` is a separate entry rather than a barrel re-export: Composer's boot imports the root
  // barrel, and the boot set is the parse graph, so the AI sink would otherwise ride along.
  entry: { index: 'src/index.ts', ai: 'src/ai/index.ts' },
  test: { node: true },
});
