//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { build } from 'esbuild';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { FixMemdownPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

import { externalsPlugin } from './externals-plugin';
import { fixRequirePlugin } from './fix-require-plugin';

export interface EsbuildExecutorOptions {
  entryPoints: string[]
  outdir?: string
  outfile?: string
  external?: string[]
}

export default async (options: EsbuildExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing esbuild...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const result = await build({
    entryPoints: options.entryPoints,
    outdir: options.outdir,
    outfile: options.outfile,
    format: 'esm',
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
      externalsPlugin({
        exclude: options.external ?? []
      }),
      FixMemdownPlugin(),
      NodeModulesPlugin(),
      fixRequirePlugin()
    ]
  });

  if (result.metafile && options.outdir) {
    writeFileSync(join(options.outdir, 'metafile.json'), JSON.stringify(result.metafile, null, 2));
  }

  return { success: result.errors.length === 0 };
};
