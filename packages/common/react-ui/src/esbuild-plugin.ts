//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import type { Plugin } from 'esbuild';
import stylePlugin from 'esbuild-style-plugin';
import { mkdir, cp } from 'node:fs/promises';
import { resolve, relative, join, basename } from 'node:path';
import tailwindcss from 'tailwindcss';

import { tailwindConfig } from './config';

export const themePlugins = (options: { content: string[]; outdir: string }): Plugin[] => {
  return [
    {
      name: 'esbuild-plugin-dxos-ui-theme-resolvers',
      setup: async (build) => {
        const fontsDir = join(options.outdir, 'node_modules/@dxos/react-ui/fonts');
        try {
          await mkdir(fontsDir);
        } catch (_e) {}
        build.onResolve({ filter: /\.woff2$/ }, async (args) => {
          const depPath = resolve(args.resolveDir, args.path);
          const destPath = join(fontsDir, basename(args.path));
          try {
            await cp(depPath, destPath);
          } catch (_e) {}
          return { path: `./${relative(options.outdir, join('fonts', basename(args.path)))}`, external: true };
        });
      }
    },
    stylePlugin({
      postcss: {
        plugins: [tailwindcss(tailwindConfig({ env: process.env.NODE_ENV, content: options.content })), autoprefixer]
      }
    })
  ];
};
