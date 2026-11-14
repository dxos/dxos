//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'stories/Diagram': 'src/stories/Diagram.stories.tsx',
    'stories/Editor': 'src/stories/Editor.stories.tsx',
    'stories/Explorer': 'src/stories/Explorer.stories.tsx',
    'stories/Views': 'src/stories/Views.stories.tsx',
  },
  jsx: 'react',
  // Two clients and an invitation before the first assertion.
  test: { storybook: { timeout: 60_000 } },
});
