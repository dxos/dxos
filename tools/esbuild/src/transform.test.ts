//
// Copyright 2023 DXOS.org
//

import { transform } from '@swc/core';

const wasmModule = require.resolve('@dxos/swc-log-plugin');

const _runTransform = async (source: string) => {
  return transform(source, {
    filename: 'test.ts',
    sourceMaps: 'inline',
    minify: false,
    jsc: {
      parser: {
        syntax: 'typescript',
        decorators: true,
      },
      experimental: {
        plugins: [[wasmModule, {}]],
      },
      target: 'es2022',
    },
  });
};

// it('transform one', async () => {
//   const source = `
//     import { log } from '@dxos/log';

//     log('hello');
//   `

//   const { code } = await runTransform(source)
//   console.log(code)
// })
