//
// Copyright 2023 DXOS.org
//

import { type Plugin } from 'esbuild';
import wasm from 'esbuild-plugin-wasm';

import {
  FixGracefulFsPlugin,
  FixMemdownPlugin,
  NodeGlobalsPolyfillPlugin,
  NodeModulesPlugin,
} from '@dxos/esbuild-plugins';

export const buildBrowserBundle = async (outfile: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { build } = await import('esbuild');
  const result = await build({
    entryPoints: [process.argv[1]],
    write: true,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    sourcemap: 'inline',
    outfile,
    plugins: [
      FixGracefulFsPlugin(),
      FixMemdownPlugin(),
      NodeGlobalsPolyfillPlugin(),
      NodeModulesPlugin(),
      wasmCompat(),
      wasm({ mode: 'embedded' }),
    ],
  });
  return result;
};

const wasmCompat = (): Plugin => ({
  name: 'wasm-compat',
  setup: (build) => {
    build.onResolve({ filter: /.*\.wasm\?init$/ }, async (args) => {
      return build.resolve(args.path.replace(/\?init$/, ''), {
        importer: args.importer,
        kind: args.kind,
        resolveDir: args.resolveDir,
      });
    });
  },
});
