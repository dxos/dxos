//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // Each play boots a client, seeds a mailbox and then polls the extraction pipeline through several
  // 15s waits of its own, so the test timeout has to clear their total or the story can never pass
  // regardless of how fast the run actually is.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 120_000 } },
});
