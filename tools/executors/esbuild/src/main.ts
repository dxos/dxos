//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { build, Format, Platform } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { writeFile } from 'node:fs/promises';
import { join } from 'path';

import { LogTransformer } from './log-transform-plugin';

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  entryPoints: string[];
  format?: Format;
  metafile: boolean;
  outputPath: string;
  platforms: Platform[];
  sourcemap: boolean;
}

export default async (options: EsbuildExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing esbuild...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const packagePath = join(context.workspace.projects[context.projectName!].root, 'package.json');

  const logTransformer = new LogTransformer({ isVerbose: context.isVerbose });

  const errors = await Promise.all(
    options.platforms.map(async (platform) => {
      const format = options.format ?? (platform !== 'node' ? 'esm' : 'cjs');
      const extension = format === 'esm' ? '.mjs' : '.cjs';
      const outdir = `${options.outputPath}/${platform}`;

      console.log({ options, format, extension });

      const start = Date.now();
      const result = await build({
        entryPoints: options.entryPoints,
        outdir,
        outExtension: { '.js': extension },
        format,
        write: true,
        sourcemap: options.sourcemap,
        metafile: options.metafile,
        bundle: options.bundle,
        platform,
        // https://esbuild.github.io/api/#log-override
        logOverride: {
          // The log transform was generating this warning.
          'this-is-undefined-in-esm': 'info'
        },
        plugins: [
          // TODO(wittjosiah): Factor out plugin and use for running browser tests as well.
          //   Ideally the package should have some way of knowing if it's misconfigured (missing @dxos/node-std dep).
          {
            name: 'node-external',
            setup: ({ onResolve }) => {
              onResolve({ filter: /^node:.*/ }, (args) => {
                if (platform !== 'browser') {
                  return null;
                }

                const module = args.path.replace(/^node:/, '');
                return { external: true, path: `@dxos/node-std/${module}` };
              });
            }
          },
          nodeExternalsPlugin({
            packagePath,
            allowList: options.bundlePackages
          }),
          logTransformer.createPlugin()
        ]
      });

      await writeFile(`${outdir}/meta.json`, JSON.stringify(result.metafile), 'utf-8');

      if (context.isVerbose) {
        console.log(`Build took ${Date.now() - start}ms.`);
      }
      return result.errors;
    })
  );

  return { success: errors.flat().length === 0 };
};
