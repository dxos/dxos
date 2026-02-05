import { resolve } from 'path';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      // TODO(wittjosiah): Remove this once we have a better solution.
      // NOTE: This is a workaround to fix "dual package hazard" where tests resolve the library's
      //   dist output while local sources might resolve differently, resulting in two distinct Context objects.
      '@dxos/web-context-solid': resolve(__dirname, '../../common/web-context-solid/src'),
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
