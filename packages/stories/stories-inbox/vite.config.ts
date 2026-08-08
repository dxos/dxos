//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // The story's first render waits on the demand-gated activation pass (the Idle wave plus every
  // plugin's start event), which costs several seconds before the play can begin, so the 15s
  // browser-mode default no longer clears it.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 120_000 } },
});
