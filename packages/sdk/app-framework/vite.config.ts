//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'vite-plugin': 'src/vite-plugin/index.ts',
    'index': 'src/index.ts',
    'core/activation-event': 'src/core/activation-event.ts',
    'common/activation-events': 'src/common/activation-events.ts',
    'common/capabilities': 'src/common/capabilities.ts',
    'core/capability': 'src/core/capability.ts',
    'core/plugin': 'src/core/plugin.ts',
    'core/plugin-manager': 'src/core/plugin-manager.ts',
    'core/url-loader': 'src/core/url-loader.ts',
    'config': 'src/config/index.ts',
    'cli': 'src/cli/index.ts',
    'testing': 'src/testing/index.ts',
    'testing/react': 'src/testing/react.tsx',
    'ui': 'src/ui/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'jsdom' }, storybook: true },
});
