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
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },
`;

// TODO(wittjosiah): Nx executor to execute in place.
const template: TemplateFunction<Input> = ({ input }) => /* javascript */ `
import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  ${input.monorepo ? monorepoConfig : ''}
  plugins: [
    dxosPlugin(${input.monorepo ? '__dirname' : ''})
  ]
});
`;

export default template;
