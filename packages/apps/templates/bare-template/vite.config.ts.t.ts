//
// Copyright 2022 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';
import config from './config.t';

const monorepoConfig = /* javascript */ `
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config'
    ]
  },
  build: {
    outDir: 'out/example/app/bare',
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },
`;

const basicBuildConfig = /* javascript */ `
  build: {
    outDir: 'out/example/app/bare'
  }
`;

// TODO(wittjosiah): Nx executor to execute in place.
export default defineTemplate<typeof config>(
  ({ input }) => /* javascript */ text`
  import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  ${input.monorepo ? monorepoConfig : basicBuildConfig}
  plugins: [
    ConfigPlugin()
  ]
});
`
);
