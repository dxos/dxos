//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { transform } from '@swc/core';
import { build, Platform } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'path';

const logSwcPlugin = require.resolve('@dxos/swc-log-plugin')

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  entryPoints: string[];
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

  const errors = await Promise.all(
    options.platforms.map(async (platform) => {
      const outdir = options.entryPoints.length > 1 ? `${options.outputPath}/${platform}` : undefined;
      const outfile = options.entryPoints.length <= 1 ? `${options.outputPath}/${platform}.js` : undefined;
      const metafile =
        options.entryPoints.length > 1 ? `${outdir}/meta.json` : `${options.outputPath}/${platform}.meta.json`;

      const start = Date.now();
      const result = await build({
        entryPoints: options.entryPoints,
        outdir,
        outfile,
        format: 'cjs',
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
          nodeExternalsPlugin({
            packagePath,
            allowList: options.bundlePackages
          }),
          {
            name: 'log-transform',
            setup: ({ onLoad, onEnd }) => {
              let files = 0;
              let time = 0;

              onLoad({ namespace: 'file', filter: /\.ts(x?)$/ }, async (args) => {
                const source = await readFile(args.path, 'utf8');

                const startTime = Date.now();

                const output = await transform(source, {
                  filename: args.path,
                  sourceMaps: 'inline',
                  minify: false,
                  jsc: {
                    parser: {
                      syntax: 'typescript',
                      decorators: true,
                    },
                    experimental: {
                      plugins: [
                        [logSwcPlugin, {}]
                      ],
                    }
                  },
                })

                time += Date.now() - startTime;
                files++;

                return {
                  contents: output.code,
                  loader: args.path.endsWith('x') ? 'tsx' : 'ts'
                };
              });

              if (context.isVerbose) {
                onEnd(() => {
                  console.log(
                    `Log preprocessing took (in parallel) ${time}ms for ${files} files (${(time / files).toFixed(0)} ms/file).`
                  );
                });
              }
            }
          }
        ]
      });

      await writeFile(metafile, JSON.stringify(result.metafile), 'utf-8');
      if(context.isVerbose) {
        console.log(`Build took ${Date.now() - start}ms.`);
      }

      return result.errors;
    })
  );

  return { success: errors.flat().length === 0 };
};
