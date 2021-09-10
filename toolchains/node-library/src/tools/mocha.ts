//
// Copyright 2021 DXOS.org
//

import { execTool } from './common';

export function execMocha (additionalArgs: string[] = []) {
  execTool('mocha', ['-r', 'ts-node/register/transpile-only', '--exit', '-t', '15000', 'src/**/*.test.{ts,js,tsx,jsx}', ...additionalArgs], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}
