//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nx/devkit';
import type { Format, Platform, Plugin } from 'esbuild';

import { forkDaemon } from '@dxos/anfang';

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

const daemon = forkDaemon({
  script: __filename,
});

type BuildContext = {
  projectRoot: string;
  isVerbose: boolean;
};

const runBuild = daemon.function(
  async (options: EsbuildExecutorOptions, context: BuildContext): Promise<{ success: boolean }> => {
    const { build } = await import('esbuild');
    const { default: RawPlugin } = await import('esbuild-plugin-raw');
    const { yamlPlugin } = await import('esbuild-plugin-yaml');
    const { readFile, writeFile, readdir, rm } = await import('node:fs/promises');
    const { dirname, join } = await import('node:path');

    const { bundleDepsPlugin } = await import('./bundle-deps-plugin');
    const { fixRequirePlugin } = await import('./fix-require-plugin');
    const { LogTransformer } = await import('./log-transform-plugin');

    console.info('Executing esbuild...');
    if (context.isVerbose) {
      console.info(`Options: ${JSON.stringify(options, null, 2)}`);
    }

    try {
      await readdir(options.outputPath);
      await rm(options.outputPath, { recursive: true });
    } catch {}

    // TODO(wittjosiah): Workspace from context is deprecated.
    const packagePath = join(context.projectRoot, 'package.json');
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
          // watch: options.watch,
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
            } satisfies Plugin,
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
            } satisfies Plugin,
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

    return { success: errors.flat().length === 0 };
  },
);

export default async (options: EsbuildExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  const projectRoot = context.workspace!.projects[context.projectName!].root;
  return runBuild(options, { projectRoot, isVerbose: context.isVerbose });
};
