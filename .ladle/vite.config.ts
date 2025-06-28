//
// Copyright 2025 DXOS.org
//

import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { ThemePlugin } from '../packages/ui/react-ui-theme/src/plugins/plugin';

/**
 * pnpm ladle dev --viteConfig .ladle/vite.config.ts
 */
// TODO(burdon): See tools/stories/.storybook/main.ts.
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    ThemePlugin({}),
  ],
});
