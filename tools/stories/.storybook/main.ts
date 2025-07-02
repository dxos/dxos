//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { type InlineConfig, mergeConfig } from 'vite';
import inspect from 'vite-plugin-inspect';
import topLevelAwait from 'vite-plugin-top-level-await';
// import turbosnap from 'vite-plugin-turbosnap';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import { satisfies } from 'storybook/internal/common';

export const packages = resolve(__dirname, '../../../packages');
const phosphorIconsCore = resolve(__dirname, '../../../node_modules/@phosphor-icons/core/assets');

const contentFiles = '*.{ts,tsx,js,jsx,css}';

const isTrue = (str?: string) => str === 'true' || str === '1';

type ConfigProps = Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>;

/**
 * Storybook and Vite configuration.
 *
 * https://storybook.js.org/docs/configure
 * https://storybook.js.org/docs/api/main-config/main-config
 * https://nx.dev/recipes/storybook/one-storybook-for-all
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: [
    '@dxos/storybook-addon-logger',
    '@dxos/storybook-addon-theme',
    '@storybook/addon-docs',
    '@storybook/addon-links',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
  ],
  staticDirs: [resolve(__dirname, '../static')],
  typescript: {
    // TODO(thure): react-docgen is failing on something in @dxos/hypercore, invoking a dialog in unrelated stories.
    reactDocgen: false,
    // skipCompiler: true,
  },

  /**
   * https://storybook.js.org/docs/api/main-config/main-config-vite-final
   */
  viteFinal: async (config: InlineConfig, options: { configType?: string }) => {
    if (isTrue(process.env.DX_DEBUG)) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ config, options }, null, 2));
    }

    return mergeConfig(config, {
      publicDir: resolve(__dirname, '../static'),
      build: {
        assetsInlineLimit: 0,
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name].[hash][extname]', // Unique asset names
          },
        },
      },
      server: {
        headers: {
          // Prevent caching icon sprite.
          'Cache-Control': 'no-store',
        },
        // hmr: {
        // TODO(burdon): Disable overlay error (e.g., "ESM integration proposal for Wasm" is not supported currently.")
        // overlay: false,
        // },
      },
      worker: {
        format: 'es',
        plugins: () => [wasm(), topLevelAwait()],
      },
      plugins: [
        //
        // NOTE: Order matters.
        //

        // https://www.npmjs.com/package/vite-plugin-wasm
        wasm(),

        // https://www.npmjs.com/package/vite-plugin-top-level-await
        topLevelAwait(),

        // https://www.npmjs.com/package/@vitejs/plugin-react-swc
        react({
          tsDecorators: true,
          plugins: [
            // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
            // TODO(burdon): Add support for signals.
            // {
            //   name: 'signals',
            //   visitor: {
            //     Program(path) {
            //       path.scope.crawl();
            //     },
            //   },
            // },
          ],
        }),

        // turbosnap({
        //   rootDir: config.root ?? __dirname,
        // }),

        // https://www.npmjs.com/package/vite-plugin-inspect
        // Open: http://localhost:5173/__inspect
        isTrue(process.env.DX_INSPECT) && inspect(),

        //
        // Custom DXOS plugins.
        //

        IconsPlugin({
          symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (name, variant) =>
            `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
          contentPaths: [resolve(packages, '**/src/**', contentFiles)],
          spriteFile: 'icons.svg',
        }),

        ThemePlugin({
          root: __dirname,
          content: [
            resolve(packages, 'apps/*/src/**', contentFiles),
            resolve(packages, 'devtools/*/src/**', contentFiles),
            resolve(packages, 'experimental/*/src/**', contentFiles),
            resolve(packages, 'plugins/*/src/**', contentFiles),
            resolve(packages, 'sdk/*/src/**', contentFiles),
            resolve(packages, 'ui/*/src/**', contentFiles),
          ],
        })
      ],
    }) as InlineConfig;
  },
} as const satisfies StorybookConfig;

export const viteFinal = (config: InlineConfig, options: { configType?: string }) => {
  return mergeConfig(config, {
    plugins: [
      react(),
      inspect(),
      topLevelAwait(),
      // turbosnap(),
      wasm(),
      IconsPlugin({
        assetPath: (name, variant) =>
          `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
        symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
        spriteFile: 'icons.svg',
        contentPaths: [resolve(packages, '**/src/**', contentFiles)],
      }),

      ThemePlugin({
        root: __dirname,
        content: [
          resolve(packages, 'apps/*/src/**', contentFiles),
          resolve(packages, 'devtools/*/src/**', contentFiles),
          resolve(packages, 'experimental/*/src/**', contentFiles),
          resolve(packages, 'plugins/*/src/**', contentFiles),
          resolve(packages, 'sdk/*/src/**', contentFiles),
          resolve(packages, 'ui/*/src/**', contentFiles),
        ],
      }),
    ],
  } satisfies InlineConfig);
};

export default config;
