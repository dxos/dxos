//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { transform } from '@swc/core';
import { build, Format, Platform } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'path';

const logSwcPlugin = require.resolve('@dxos/swc-log-plugin')

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
  const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));

  const errors = await Promise.all(
    options.platforms.map(async (platform) => {
      const extension = options.format === 'esm' || platform !== 'node' ? '.mjs' : '.cjs';
      const outdir = `${options.outputPath}/${platform}`;

      const start = Date.now();
      const result = await build({
        entryPoints: options.entryPoints,
        outdir,
        outExtension: { '.js': extension },
        format: options.format ?? platform !== 'node' ? 'esm' : 'cjs',
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
          {
            name: 'node-external',
            setup: ({ onResolve }) => {
              onResolve({ filter: /^node:.*/ }, (args) => {
                const browserMapped = packageJson.browser?.[args.path];
                if (!browserMapped) {
                  return null;
                }

                return { external: true, path: browserMapped };
              });
            }
          },
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
                    },
                    target: 'es2022',
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

      await writeFile(`${outdir}/meta.json`, JSON.stringify(result.metafile), 'utf-8');
      
      if(context.isVerbose) {
        console.log(`Build took ${Date.now() - start}ms.`);
      }
      return result.errors;
    })
  );

  return { success: errors.flat().length === 0 };
};
