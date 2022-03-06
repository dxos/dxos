//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { ChildProcess, spawn, SpawnSyncOptionsWithBufferEncoding } from 'child_process';

import { TOOLCHAIN_PACKAGE_DIR } from '../common';

function printChildStatus (child: ChildProcess, name: string, start: number) {
  if (child.exitCode === null) {
    process.stderr.write(chalk`{red error}: ${name} terminated due to a signal: ${child.signalCode}\n`);
    process.exit(1);
  } else if (child.exitCode !== 0) {
    process.stderr.write(chalk`{red error}: ${name} exited with code ${child.exitCode}\n`);
    process.exit(child.exitCode ?? 1);
  } else {
    console.log(chalk`{green.bold OK} in {bold ${Date.now() - start}} ms`);
  }
}

export async function execTool (name: string, args: string[] = [], opts?: SpawnSyncOptionsWithBufferEncoding) {
  const start = Date.now();

  const child = spawn(`${TOOLCHAIN_PACKAGE_DIR}/node_modules/.bin/${name}`, args, {
    stdio: 'inherit',
    ...opts
  });

  await new Promise<void>((resolve, reject) => {
    child.on('exit', (code) => {
      resolve();
    });
  });

  printChildStatus(child, name, start);
}

export async function execCommand (command: string, args: string[]) {
  const start = Date.now();

  const child = spawn(command, args, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${TOOLCHAIN_PACKAGE_DIR}/node_modules/.bin:${process.cwd()}/node_modules/.bin:${process.env.PATH}`
    }
  });

  await new Promise<void>((resolve, reject) => {
    child.on('exit', (code) => {
      resolve();
    });
  });

  printChildStatus(child, command, start);
}
