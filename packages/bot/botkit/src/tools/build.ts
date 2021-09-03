//
// Copyright 2021 DXOS.org
//

import { build } from 'esbuild';
import { resolve } from 'path';

import { createId } from '@dxos/crypto';
import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

const BUILD_PATH = './out/builds/';

export const buildBot = async (botPath: string, browser: boolean, buildPath?: string) => {
  if (!buildPath) {
    buildPath = resolve(BUILD_PATH, `${createId()}.js`);
  }

  await build({
    entryPoints: [botPath],
    write: true,
    bundle: true,
    platform: browser ? 'browser' : 'node',
    format: 'cjs',
    // sourcemap: 'inline',
    outfile: buildPath,
    external: browser
      ? ['read-pkg-up']
      : [
          'fatfs',
          'runtimejs',
          'wrtc',
          'bip32',
          'typeforce',
          'sodium-universal'
        ],
    plugins: browser
      ? [
          NodeModulesPlugin(),
          NodeGlobalsPolyfillPlugin(),
          FixMemdownPlugin(),
          FixGracefulFsPlugin()
        ]
      : []
  });

  return buildPath;
};
