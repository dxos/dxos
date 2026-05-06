// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/cli/index.ts',
    'src/core/activation-event.ts',
    'src/core/capability.ts',
    'src/core/plugin.ts',
    'src/core/plugin-manager.ts',
    'src/common/capabilities.ts',
    'src/common/activation-events.ts',
    'src/ui/index.ts',
    'src/testing/index.ts',
    'src/testing/react.tsx',
    'src/core/url-loader.ts',
  ],
});
