//
// Copyright 2022 DXOS.org
//

import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';

import type * as Swc from '@swc/core';
import { type Format, type Platform, type Plugin, build } from 'esbuild';
import glsl from 'esbuild-plugin-glsl';
import RawPlugin from 'esbuild-plugin-raw';
import { yamlPlugin } from 'esbuild-plugin-yaml';
import pkgUp from 'pkg-up';

import { NodeExternalPlugin } from '@dxos/esbuild-plugins';

import { bundleDepsPlugin } from './bundle-deps-plugin';
import { esmOutputToCjs } from './esm-output-to-cjs-plugin';
import { fixRequirePlugin } from './fix-require-plugin';
import { restrictRelativeImportsPlugin } from './plugin-restrict-relative-imports';
import { SwcTransformPlugin } from './swc-transform-plugin';

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  ignorePackages: string[];
  alias: Record<string, string>;
  entryPoints: string[];
  injectGlobals: boolean;
  importGlobals: boolean;
  metafile: boolean;
  outputPath: string;
  platforms: Platform[];
  moduleFormat: Format[];
  sourcemap: boolean;
  watch: boolean;
  preactSignalTracking: boolean;
  verbose: boolean;
}

export default async (options: EsbuildExecutorOptions): Promise<{ success: boolean }> => {
  if (options.verbose) {
    console.info('Executing esbuild...');
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  try {
    await readdir(options.outputPath);
    await rm(options.outputPath, { recursive: true });
  } catch {}

  const packagePath = pkgUp.sync({ cwd: process.cwd() });
  if (!packagePath) {
    throw new Error('Could not find package.json.');
  }
  const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));

  const swcTransformPlugin = new SwcTransformPlugin({
    isVerbose: options.verbose,
    getTranspilerOptions: ({ filePath }) => ({
      filename: basename(filePath),
      sourceMaps: 'inline',
      minify: false,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        experimental: {
          plugins: [
            ...(function* (): Iterable<Swc.WasmPlugin> {
              yield [
                require.resolve('@dxos/swc-log-plugin'),
                {
                  filename: filePath,
                  to_transform: [
                    {
                      name: 'log',
                      package: '@dxos/log',
                      param_index: 2,
                      include_args: false,
                      include_call_site: true,
                      include_scope: true,
                    },
                    {
                      name: 'invariant',
                      package: '@dxos/invariant',
                      param_index: 2,
                      include_args: true,
                      include_call_site: false,
                      include_scope: true,
                    },
                    {
                      name: 'Context',
                      package: '@dxos/context',
                      param_index: 1,
                      include_args: false,
                      include_call_site: false,
                      include_scope: false,
                    },
                  ],
                },
              ];

              if (options.preactSignalTracking) {
                // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
                yield ['@preact-signals/safe-react/swc', { mode: 'all' }];
              }
            })(),
          ],
        },
        target: 'esnext',
      },
    }),
  });

  const configurations = options.platforms.flatMap((platform) =>
    platform === 'node'
      ? [
          ...(options.moduleFormat.includes('esm')
            ? [{ platform: 'node', format: 'esm', slug: 'node-esm', replaceRequire: false }]
            : []),
          ...(options.moduleFormat.includes('cjs')
            ? [{ platform: 'node', format: 'cjs', slug: 'node-cjs', replaceRequire: false }]
            : []),
        ]
      : [{ platform: 'browser', format: 'esm', slug: 'browser', replaceRequire: true }],
  );

  const errors = await Promise.all(
    configurations.map(async ({ platform, format, slug, replaceRequire }) => {
      const extension = format === 'esm' ? '.mjs' : '.cjs';
      const outdir = `${options.outputPath}/${slug}`;

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
        platform: platform as Platform,
        // https://esbuild.github.io/api/#log-override
        logOverride: {
          // The log transform was generating this warning.
          'this-is-undefined-in-esm': 'info',
        },
        banner: {
          js: format === 'esm' && platform === 'node' ? CREATE_REQUIRE_BANNER : '',
        },
        define:
          format === 'cjs'
            ? {
                'import.meta.dirname': '__dirname',
              }
            : undefined,
        plugins: [
          restrictRelativeImportsPlugin({
            allowedDirectory: process.cwd(),
          }),
          NodeExternalPlugin({
            injectGlobals: options.injectGlobals,
            importGlobals: options.importGlobals,
            nodeStd: Boolean(packageJson.dependencies?.['@dxos/node-std']),
          }),
          replaceRequire ? fixRequirePlugin() : undefined,
          bundleDepsPlugin({
            packages: options.bundlePackages,
            packageDir: dirname(packagePath),
            ignore: options.ignorePackages,
            alias: options.alias,
          }),
          swcTransformPlugin.createPlugin(),
          RawPlugin(),
          // Substitute '/*?url' imports with empty string.
          {
            name: 'url',
            setup: ({ onResolve, onLoad }) => {
              onResolve({ filter: /\?url$/ }, (args) => ({
                path: args.path.replace(/\?url$/, '/empty-url'),
                namespace: 'url',
              }));

              onLoad({ filter: /\/empty-url/, namespace: 'url' }, async (args) => ({ contents: 'export default ""' }));
            },
          } satisfies Plugin,
          yamlPlugin({}),
          // GLSL support for shaders.
          // https://github.com/vanruesc/esbuild-plugin-glsl
          glsl({}),
          ...(format === 'cjs' ? [esmOutputToCjs()] : []),
        ].filter((x) => x !== undefined),
      });

      await writeFile(`${outdir}/meta.json`, JSON.stringify(result.metafile), 'utf-8');

      if (options.verbose) {
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

const CREATE_REQUIRE_BANNER =
  "import { createRequire } from 'node:module';const require = createRequire(import.meta.url);";
