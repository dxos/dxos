// Copyright 2026 DXOS.org

import { defineConfig } from '../../../../tsdown.base.config.ts';

export default defineConfig({
  entry: ['src/edge-ws-muxer.ts', 'src/index.ts', 'src/testing/index.ts'],
  platform: ['neutral'],
});
