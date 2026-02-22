//
// Copyright 2022 DXOS.org
//

import { cp, mkdir } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import type { Plugin } from 'esbuild';
import stylePlugin from 'esbuild-style-plugin';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';

export const ThemePlugins = async (options: {
  outdir: string;
}): Promise<Plugin[]> => {
  return [
    // TODO(burdon): FIX!!! Is this still required?
    // Based on: https://github.com/evanw/esbuild/issues/800#issuecomment-786151076
    {
      name: 'esbuild-plugin-dxos-ui-theme-resolvers',
      setup: async (build) => {
        const fontsDir = join(options.outdir, 'node_modules/@dxos/ui-theme/fonts');
        await mkdir(fontsDir, { recursive: true });
        build.onResolve({ filter: /\.woff2$/ }, async (args) => {
          const depPath = resolve(args.resolveDir, args.path);
          const destPath = join(fontsDir, basename(args.path));
          await cp(depPath, destPath);
          return {
            path: `./${relative(options.outdir, destPath)}`,
            external: true,
          };
        });
      },
    },
    stylePlugin({
      postcss: {
        plugins: [
          postcssImport(),
          postcssNesting(),
          tailwindcss({
            base: resolve(import.meta.dirname, '../../../..'),
          }),
          autoprefixer,
        ],
      },
    }),
  ];
};
