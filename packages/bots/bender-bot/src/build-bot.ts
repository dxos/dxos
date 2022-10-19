//
// Copyright 2022 DXOS.org
//

import { build } from 'esbuild';

export interface BuildBotOptions {
  entryPoint: string
  outfile: string
}

export const buildBot = async ({ entryPoint, outfile } : BuildBotOptions) => {
  await build({
    bundle: true,
    entryPoints: [entryPoint],
    outfile,
    write: true,
    format: 'cjs',
    platform: 'node',
    sourcemap: true,
    external: [
      '@koush/wrtc',
      'avsc',
      'bip32',
      'electron',
      'fatfs',
      'runtimejs',
      'sodium-native',
      'sodium-universal',
      'thrift',
      'typeforce',
      'ws'
    ]
  });
};
