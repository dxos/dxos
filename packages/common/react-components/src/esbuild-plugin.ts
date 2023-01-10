//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import type { Plugin } from 'esbuild';
import stylePlugin from 'esbuild-style-plugin';
import { mkdir, cp } from 'node:fs/promises';
import { resolve, relative, join, basename } from 'node:path';
import { AcceptedPlugin } from 'postcss';
import tailwindcss from 'tailwindcss';

import { tailwindConfig } from './config';

export const ThemePlugins = (options: { content: string[]; outdir: string }): Plugin[] => {
  return [
    // TODO(thure): This really shouldn’t be this way, but after hours of searching for a reasonable way to do this I came up empty. The prior art I found was mainly this thread, though it’s only tangentially related: https://github.com/evanw/esbuild/issues/800#issuecomment-786151076
    {
      name: 'esbuild-plugin-dxos-ui-theme-resolvers',
      setup: async (build) => {
        const fontsDir = join(options.outdir, 'node_modules/@dxos/react-components/fonts');
        try {
          await mkdir(fontsDir);
        } catch (_err) {}
        build.onResolve({ filter: /\.woff2$/ }, async (args) => {
          const depPath = resolve(args.resolveDir, args.path);
          const destPath = join(fontsDir, basename(args.path));
          try {
            await cp(depPath, destPath);
          } catch (_err) {}
          return { path: `./${relative(options.outdir, join('fonts', basename(args.path)))}`, external: true };
        });
      }
    },
    // TODO(thure): theme.css must be part of entryPoints in order to be processed with `stylePlugin`, but this should not be necessary. ESBuild would not load theme.css using stylePlugin if referenced within index.ts(x) as with the Vite plugin.
    // TODO(thure): Note also that because it is an entryPoint, the developer has to reference the built theme.css from `index.html`, which is inflexible and possibly inconvenient.
    stylePlugin({
      postcss: {
        plugins: [
          tailwindcss(tailwindConfig({ env: process.env.NODE_ENV, content: options.content })) as AcceptedPlugin,
          autoprefixer
        ]
      }
    })
  ];
};
