//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    manager: 'src/manager.tsx',
    preview: 'src/preview.tsx',
    download: 'src/download.ts',
  },
  jsx: 'react',
  // Classic runtime (`React.createElement`), not automatic. The `manager` entry runs inside the
  // Storybook manager, which provides its own React 18 as a global; automatic-runtime output imports
  // `react/jsx-runtime`, which Storybook's manager builder inlines from this repo's React 19 and then
  // crashes on `ReactSharedInternals.recentlyCreatedOwnerStacks`. Classic emits `React.createElement`
  // off the externalized `react` global, so it works against both React 18 (manager) and 19 (preview).
  jsxRuntime: 'classic',
});
