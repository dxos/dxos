//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { build, Format, Platform } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import RawPlugin from 'esbuild-plugin-raw';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { LogTransformer } from './log-transform-plugin';

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  entryPoints: string[];
  format?: Format;
  injectGlobals: boolean;
  metafile: boolean;
  outputPath: string;
  platforms: Platform[];
  sourcemap: boolean;
  watch: boolean;
}

export default async (options: EsbuildExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing esbuild...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  try {
    await readdir(options.outputPath);
    await rm(options.outputPath, { recursive: true });
  } catch {}

  // TODO(wittjosiah): Workspace from context is deprecated.
  const packagePath = join(context.workspace!.projects[context.projectName!].root, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));

  const logTransformer = new LogTransformer({ isVerbose: context.isVerbose });

  const errors = await Promise.all(
    options.platforms.map(async (platform) => {
      const format = options.format ?? (platform !== 'node' ? 'esm' : 'cjs');
      const extension = format === 'esm' ? '.mjs' : '.cjs';
      const outdir = `${options.outputPath}/${platform}`;

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
        watch: options.watch,
        platform,
        // https://esbuild.github.io/api/#log-override
        logOverride: {
          // The log transform was generating this warning.
          'this-is-undefined-in-esm': 'info'
        },
        plugins: [
          // TODO(wittjosiah): Factor out plugin and use for running browser tests as well.
          {
            name: 'node-external',
            setup: ({ initialOptions, onResolve }) => {
              if (options.injectGlobals && platform === 'browser') {
                if (!packageJson.dependencies['@dxos/node-std']) {
                  throw new Error('Missing @dxos/node-std dependency.');
                }

                initialOptions.banner ||= {};
                initialOptions.banner.js = 'import "@dxos/node-std/globals"';
              }

              onResolve({ filter: /^node:.*/ }, (args) => {
                if (platform !== 'browser') {
                  return null;
                }

                if (!packageJson.dependencies['@dxos/node-std']) {
                  return { errors: [{ text: 'Missing @dxos/node-std dependency.' }] };
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
          logTransformer.createPlugin(),
          RawPlugin()
        ]
      });

      await writeFile(`${outdir}/meta.json`, JSON.stringify(result.metafile), 'utf-8');

      if (context.isVerbose) {
        console.log(`Build took ${Date.now() - start}ms.`);
      }
      return result.errors;
    })
  );

  if (options.watch) {
    await new Promise(() => {}); // wait indefinitely
  }

  return { success: errors.flat().length === 0 };
};
