//
// Copyright 2025 DXOS.org
//

import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { ThemePlugin } from '../packages/ui/react-ui-theme/src/plugins/plugin';

/**
 * pnpm ladle dev --viteConfig .ladle/vite.config.ts
 */
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    ThemePlugin({}),
  ],
});
