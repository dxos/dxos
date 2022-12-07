//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import type { Plugin } from 'esbuild';
import stylePlugin from 'esbuild-style-plugin';
// import { resolve } from 'node:path';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';

import { tailwindConfig } from './config';

export const themePlugins = (options: { content: string[] }): Plugin[] => {
  // const cssPath = resolve(__dirname, './theme.css');
  const configuredStylePlugin = stylePlugin({
    postcss: {
      plugins: [tailwindcss(tailwindConfig({ env: process.env.NODE_ENV, content: options.content })), autoprefixer]
    }
  });

  const cssPath = resolve(__dirname, './theme.css');

  return [
    {
      name: 'esbuild-plugin-dxos-ui-theme-resolvers',
      setup: (build) => {
        build.onResolve({ filter: /\.woff2$/ }, async (args) => {
          return { path: args.path, external: true };
        });
        build.onResolve({ filter: /^@dxosTheme$/ }, async (args) => {
          return { path: cssPath };
        });
        // build.onResolve({ filter: /^stylePlugin:(.+)\.css$/ }, async (args) => {
        // });
      }
    },
    configuredStylePlugin
  ];
};
