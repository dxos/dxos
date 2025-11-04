//
// Copyright 2023 DXOS.org
//

import { type Plugin } from 'esbuild';
import { wasmLoader } from 'esbuild-plugin-wasm';

import { FixGracefulFsPlugin, NodeGlobalsPolyfillPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

export const buildBrowserBundle = async (outfile: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      NodeGlobalsPolyfillPlugin(),
      NodeModulesPlugin(),
      signalStubPlugin(),
      wasmCompat(),
      wasmLoader({ mode: 'embedded' }),
    ],
  });
  return result;
};

const signalStubPlugin = (): Plugin => ({
  name: 'signal-stub',
  setup: (build) => {
    build.onResolve({ filter: /^@dxos\/signal$/ }, (args) => ({ path: args.path, namespace: 'signal-stub' }));

    build.onLoad({ filter: /.*/, namespace: 'signal-stub' }, () => ({
      contents: `
          export class SignalServerRunner {
            constructor() {}
            async start() {}
            async stop() {}
          }
          export {}; // For any other exports
        `,
    }));
  },
});

const wasmCompat = (): Plugin => ({
  name: 'wasm-compat',
  setup: (build) => {
    build.onResolve({ filter: /.*\.wasm\?init$/ }, async (args) =>
      build.resolve(args.path.replace(/\?init$/, ''), {
        importer: args.importer,
        kind: args.kind,
        resolveDir: args.resolveDir,
      }),
    );
  },
});
