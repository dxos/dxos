//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // The scripted delegation story drives a full supervisor -> sub-agent -> result round trip and
  // its own findByText bounds already total well past the default, so the test timeout has to
  // clear them or it can never pass regardless of how fast the run actually is.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 120_000 } },
});
