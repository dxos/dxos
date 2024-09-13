//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nx/devkit';
import { build, type Format, type Platform } from 'esbuild';
import RawPlugin from 'esbuild-plugin-raw';
import { yamlPlugin } from 'esbuild-plugin-yaml';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NodeExternalPlugin } from '@dxos/esbuild-plugins';

import { bundleDepsPlugin } from './bundle-deps-plugin';
import { esmOutputToCjs } from './esm-output-to-cjs-plugin';
import { fixRequirePlugin } from './fix-require-plugin';
import { LogTransformer } from './log-transform-plugin';

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  ignorePackages: string[];
  alias: Record<string, string>;
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
  if (context.isVerbose) {
    console.info('Executing esbuild...');
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
        format: 'esm', // Output is later transpiled to CJS via plugin.
        write: true,
        splitting: true,
        sourcemap: options.sourcemap,
        metafile: options.metafile,
        bundle: options.bundle,
        // watch: options.watch,
        alias: options.alias,
        platform,
        // https://esbuild.github.io/api/#log-override
        logOverride: {
          // The log transform was generating this warning.
          'this-is-undefined-in-esm': 'info',
        },
        plugins: [
          NodeExternalPlugin({
            injectGlobals: options.injectGlobals,
            nodeStd: Boolean(packageJson.dependencies['@dxos/node-std']),
          }),
          fixRequirePlugin(),
          bundleDepsPlugin({
            packages: options.bundlePackages,
            packageDir: dirname(packagePath),
            ignore: options.ignorePackages,
            alias: options.alias,
          }),
          logTransformer.createPlugin(),
          RawPlugin(),
          // Substitute '/*?url' imports with empty string.
          {
            name: 'url',
            setup: ({ onResolve, onLoad }) => {
              onResolve({ filter: /\?url$/ }, (args) => {
                return {
                  path: args.path.replace(/\?url$/, '/empty-url'),
                  namespace: 'url',
                };
              });

              onLoad({ filter: /\/empty-url/, namespace: 'url' }, async (args) => {
                return { contents: 'export default ""' };
              });
            },
          },
          yamlPlugin({}),
          ...(format === 'cjs' ? [esmOutputToCjs()] : []),
        ],
      });

      await writeFile(`${outdir}/meta.json`, JSON.stringify(result.metafile), 'utf-8');

      if (context.isVerbose) {
        console.log(`Build took ${Date.now() - start}ms.`);
      }

      return result.errors;
    }),
  );

  if (options.watch) {
    await new Promise(() => {}); // Wait indefinitely.
  }

  return { success: errors.flat().length === 0 };
};
