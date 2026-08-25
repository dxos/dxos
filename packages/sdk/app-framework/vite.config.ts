//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'vite-plugin': 'src/vite-plugin/index.ts',
    // Split out of `vite-plugin` so a runtime host can read the shared-package list without
    // pulling in Vite itself — the CLI registers the same set in bun's module registry.
    'vite-plugin/packages': 'src/vite-plugin/packages.ts',
    'index': 'src/index.ts',
    'core/activation-event': 'src/core/activation-event.ts',
    'common/activation-events': 'src/common/activation-events.ts',
    'common/capabilities': 'src/common/capabilities.ts',
    'core/capability': 'src/core/capability.ts',
    'core/plugin': 'src/core/plugin.ts',
    'core/plugin-manager': 'src/core/plugin-manager/index.ts',
    'core/url-loader': 'src/core/url-loader.ts',
    'config': 'src/config/index.ts',
    'cli': 'src/cli/index.ts',
    'testing': 'src/testing/index.ts',
    'testing/react': 'src/testing/react.tsx',
    'ui': 'src/ui/index.ts',
    'core/capability-manager': 'src/core/capability-manager.ts',
    'plugin-process-manager/history/history-tracker': 'src/plugin-process-manager/history/history-tracker.ts',
    'core/plugin-asset-cache': 'src/core/plugin-asset-cache.ts',
    'core/plugin-manifest': 'src/core/plugin-manifest.ts',
    'core/registry': 'src/core/registry.ts',
    'common/Role': 'src/common/Role.ts',
    'plugin-process-manager/history/undo-mapping': 'src/plugin-process-manager/history/undo-mapping.ts',
    'plugin-process-manager/history/undo-registry': 'src/plugin-process-manager/history/undo-registry.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'jsdom' }, storybook: true },
});
