//
// Copyright 2022 DXOS.org
//

import { TemplateFunction } from '@dxos/plate';

export type Input = {
  monorepo?: boolean
}

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
const template: TemplateFunction<Input> = ({ input }) => /* javascript */ `
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
`;

export default template;
