//
// Copyright 2021 DXOS.org
//

import { build } from 'esbuild';

export interface BuildBotOptions {
  entryPoint: string,
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
    external: [
      'fatfs',
      'runtimejs',
      'wrtc',
      'bip32',
      'typeforce',
      'sodium-universal',
      'sodium-native',
      'utp-native'
    ]
  });
};
