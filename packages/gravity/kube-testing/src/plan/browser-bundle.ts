//
// Copyright 2023 DXOS.org
//

import {
  FixGracefulFsPlugin,
  FixMemdownPlugin,
  NodeGlobalsPolyfillPlugin,
  NodeModulesPlugin,
} from '@dxos/esbuild-plugins';

export const buildBrowserBundle = async (outfile: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { build } = require('esbuild');
  await build({
    entryPoints: [process.argv[1]],
    write: true,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: 'inline',
    outfile,
    plugins: [FixGracefulFsPlugin(), FixMemdownPlugin(), NodeGlobalsPolyfillPlugin(), NodeModulesPlugin()],
  });
};
