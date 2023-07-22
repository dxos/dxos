//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nx/devkit';
import { build, Format, Platform } from 'esbuild';
import RawPlugin from 'esbuild-plugin-raw';
import { yamlPlugin } from 'esbuild-plugin-yaml';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { bundleDepsPlugin } from './bundle-deps-plugin';
import { fixRequirePlugin } from './fix-require-plugin';
import { LogTransformer } from './log-transform-plugin';

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  alias: Record<string, string>;
  entryPoints: string[];
  format?: Format;
  injectGlobals: boolean;
  metafile: boolean;
  outputPath: string;
  platforms: Platform[];
  sourcemap: boolean;
  watch: boolean;
  setExports: boolean;
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
        splitting: format === 'esm',
        sourcemap: options.sourcemap,
        metafile: options.metafile,
        bundle: options.bundle,
        watch: options.watch,
        alias: options.alias,
        platform,
        // https://esbuild.github.io/api/#log-override
        logOverride: {
          // The log transform was generating this warning.
          'this-is-undefined-in-esm': 'info',
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
                initialOptions.banner.js = 'import "@dxos/node-std/globals";';
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
            },
          },
          fixRequirePlugin(),
          bundleDepsPlugin({
            packages: options.bundlePackages,
            packageDir: dirname(packagePath),
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

  if(options.setExports) {
    await setPackageExports(options, context);
  }

  return { success: errors.flat().length === 0 };
};

const setPackageExports = async (options: EsbuildExecutorOptions, context: ExecutorContext) => {
  const packageRoot = context.workspace!.projects[context.projectName!].root;
  const manifestPath = join(packageRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(manifestPath, 'utf-8'));

  const exports: any = {}
  let types = ''
  const typesVersions: any = { '*': {} }

  for(const entrypoint of options.entryPoints) {
    // path relative to src dir
    const relativePath = relative(join(packageRoot, 'src'), entrypoint);
    
    // remove trailing index.ts
    let entrypointName = relativePath
      .replace(/index\.ts$/, '')
      .replace(/\/$/, '')
      .replace(/\.ts$/, ''); // remove extension

    // add leading .
    const exportName = entrypointName === '' ? '.' : `./${entrypointName}`;

    const relativeOutDir = relative(packageRoot, options.outputPath);
    const artifactName = relativePath.replace(/\.ts$/, '');

    // TODO(dmaretskyi): Update with Node ESM.
    exports[exportName] = {}

    // NOTE: Order is significant and represents priority.
    if(options.platforms.includes('node')) {
      exports[exportName].node = './' + join(relativeOutDir, 'node', `${artifactName}.cjs`);
    }
    if(options.platforms.includes('browser')) {
      exports[exportName].browser = './' + join(relativeOutDir, 'browser', `${artifactName}.mjs`);
    }
    if(options.platforms.includes('node')) {
      exports[exportName].require = './' + join(relativeOutDir, 'node', `${artifactName}.cjs`);
    }
    if(options.platforms.includes('browser')) {
      exports[exportName].import = './' + join(relativeOutDir, 'browser', `${artifactName}.mjs`);
    }

    if(entrypointName === '') {
      types = 'dist/types/src/index.d.ts'
    } else {
      typesVersions['*'][entrypointName] = [
        relativePath.endsWith('index.ts')
        ? join('dist/types/src', entrypointName, 'index.d.ts')
        : join('dist/types/src', `${entrypointName}.d.ts`),

        ]
    }

  }

  packageJson.exports = exports;
  if(types) {
    packageJson.types = types;
  }
  packageJson.typesVersions = typesVersions;

  if(Object.keys(packageJson.typesVersions['*']).length === 0) {
    delete packageJson.typesVersions;
  }
  delete packageJson.main;
  delete packageJson.module;
  if(packageJson.browser) {
    delete packageJson.browser['./dist/lib/node/index.cjs'];
  }
  if(typeof packageJson.browser === 'string' || packageJson.browser && Object.keys(packageJson.browser).length === 0) {
    delete packageJson.browser;
  }

  await writeFile(manifestPath, JSON.stringify(packageJson, null, 2), 'utf-8');
}