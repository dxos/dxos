//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'cli': 'src/cli/index.ts',
    'core/activation-event': 'src/core/activation-event.ts',
    'core/capability': 'src/core/capability.ts',
    'core/plugin': 'src/core/plugin.ts',
    'core/plugin-manager': 'src/core/plugin-manager.ts',
    'common/capabilities': 'src/common/capabilities.ts',
    'common/activation-events': 'src/common/activation-events.ts',
    'ui': 'src/ui/index.ts',
    'testing': 'src/testing/index.ts',
    'testing/react': 'src/testing/react.tsx',
    'core/url-loader': 'src/core/url-loader.ts',
    'config': 'src/config/index.ts',
    'vite-plugin': 'src/vite-plugin/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: { environment: 'jsdom' }, storybook: true },
});
