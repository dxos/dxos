//
// Copyright 2022 DXOS.org
//

import { defineTemplate, Imports, text } from '@dxos/plate';
import config from './config.t';

export default defineTemplate<typeof config>(({ input, defaultOutputFile }) => {
  const { react, name } = input;
  const imports = new Imports();
  const reactPlugin = imports.lazy('react', '@vitejs/plugin-react', { isDefault: true });
  const monorepoConfig = text`
    optimizeDeps: {
      force: true,
      include: [
        '@dxos/client',
        ${react ? "'@dxos/react-client'," : ''}
        '@dxos/config'
      ],
      esbuildOptions: {
        // TODO(wittjosiah): Remove.
        plugins: [
          {
            name: 'yjs',
            setup: ({ onResolve }) => {
              onResolve({ filter: /yjs/ }, () => {
                return { path: require.resolve('yjs').replace('.cjs', '.mjs') }
              })
            }
          }
        ]
      }
    },
    build: {
      outDir: 'out/app/${name}',
      commonjsOptions: {
        include: [
          /packages/,
          /node_modules/
        ]
      }
    },
    `;
  const basicConfig = text`
    build: {
      outDir: 'out/app/${name}'
    }
    `;
  return /* javascript */ text`
  import { defineConfig } from 'vite';
  import { ConfigPlugin } from '@dxos/config/vite-plugin';
  ${() => imports.render(defaultOutputFile)}

  // https://vitejs.dev/config/
  export default defineConfig({
    base: '', // Ensures relative path to assets.
    server: {
      host: true
    },
    ${input.monorepo ? monorepoConfig : basicConfig}
    plugins: [
      ConfigPlugin(),
      ${react ? `${reactPlugin()}(),` : ''}
    ]
  });
  `;
});
