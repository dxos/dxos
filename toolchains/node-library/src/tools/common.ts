//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { spawnSync, SpawnSyncOptionsWithBufferEncoding } from 'child_process';

import { TOOLCHAIN_PACKAGE_DIR } from '../common';

export function execTool (name: string, args: string[] = [], opts?: SpawnSyncOptionsWithBufferEncoding) {
  const before = Date.now();

  const child = spawnSync(`${TOOLCHAIN_PACKAGE_DIR}/node_modules/.bin/${name}`, args, { stdio: 'inherit', ...opts });
  if (child.status !== 0) {
    process.stderr.write(chalk`{red error}: ${name} exited with code ${child.status}\n`);
    process.exit(child.status ?? 1);
  } else {
    console.log(chalk`{green.bold OK} in {bold ${Date.now() - before}} ms`);
  }
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
  if (child.status !== 0) {
    process.stderr.write(chalk`{red error}: ${command} exited with code ${child.status}\n`);
    process.exit(child.status ?? 1);
  } else {
    console.log(chalk`{green.bold OK} in {bold ${Date.now() - before}} ms`);
  }
}
