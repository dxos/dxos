//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { build } from 'esbuild';
// import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { join } from 'path';

import { FixMemdownPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';
import { externalsPlugin } from './externals-plugin';

export interface EsbuildExecutorOptions {
  entryPoints: string[]
  outdir?: string
  outfile?: string
  external?: string[]
}

export default async (options: EsbuildExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "esbuild"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  const packagePath = join(context.workspace.projects[context.projectName!].root, 'package.json');

  const result = await build({
    entryPoints: options.entryPoints,
    outdir: options.outdir,
    outfile: options.outfile,
    format: 'cjs',
    write: true,
    bundle: true,
    metafile: true,
    platform: 'browser',
    // https://esbuild.github.io/api/#log-override
    logOverride: {
      // @polkadot/api/augment/rpc was generating this warning.
      // It is specifically type related and has no effect on the final bundle behavior.
      'ignored-bare-import': 'info'
    },
    plugins: [
      // nodeExternalsPlugin({
      //   packagePath,
      //   allowList: options.bundlePackages
      // }),
      externalsPlugin({
        exclude: options.external ?? [],
      }),
      FixMemdownPlugin(),
      NodeModulesPlugin()
    ]
  });

  return { success: result.errors.length === 0 };
};
