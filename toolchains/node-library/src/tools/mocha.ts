//
// Copyright 2021 DXOS.org
//

import { execTool } from './common';

export interface ExecMochaOpts {
  forceClose?: boolean,
  userArgs?: string[]
}

export function execMocha ({ userArgs = [], forceClose }: ExecMochaOpts) {
  execTool('mocha', [
    '-r', 'ts-node/register/transpile-only',
    forceClose ? '--exit' : '--no-exit',
    '-t', '15000',
    'src/**/*.test.ts',
    ...userArgs
  ], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}
