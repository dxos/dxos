//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { spawnSync, SpawnSyncOptionsWithBufferEncoding, SpawnSyncReturns } from 'child_process';

import { TOOLCHAIN_PACKAGE_DIR } from '../common';

function printChildStatus (child: SpawnSyncReturns<any>, name: string, startTime: number) {
  if (child.status === null) {
    process.stderr.write(chalk`{red error}: ${name} terminated due to a signal: ${child.signal}\n`);
    process.exit(1);
  } else if (child.status !== 0) {
    process.stderr.write(chalk`{red error}: ${name} exited with code ${child.status}\n`);
    process.exit(child.status ?? 1);
  } else {
    console.log(chalk`{green.bold OK} in {bold ${Date.now() - startTime}} ms`);
  }
}

export function execTool (name: string, args: string[] = [], opts?: SpawnSyncOptionsWithBufferEncoding) {
  const before = Date.now();

  const child = spawnSync(`${TOOLCHAIN_PACKAGE_DIR}/node_modules/.bin/${name}`, args, { stdio: 'inherit', ...opts });

  printChildStatus(child, name, before);
}

export function execCommand (command: string, args: string[]) {
  const before = Date.now();

  const child = spawnSync(command, args, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${TOOLCHAIN_PACKAGE_DIR}/node_modules/.bin:${process.cwd()}/node_modules/.bin:${process.env.PATH}`
    }
  });

  printChildStatus(child, command, before);
}
