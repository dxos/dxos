//
// Copyright 2021 DXOS.org
//

import { execTool } from './common';

export interface ExecMochaOpts {
  forceClose?: boolean,
  userArgs?: string[],
  jsdom?: boolean
}

export function execMocha ({ userArgs = [], forceClose, jsdom = false }: ExecMochaOpts) {
  const jsdomArray = jsdom ? ['-r', 'jsdom-global/register'] : [];
  execTool('mocha', [
    '-r', 'ts-node/register/transpile-only',
    '-r', require.resolve('./wtfnode.js'),
    ...jsdomArray,

    forceClose ? '--exit' : '--no-exit',
    '-t', '15000',
    'src/**/*.test.{ts,js,tsx,jsx}',
    ...userArgs
  ], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}
