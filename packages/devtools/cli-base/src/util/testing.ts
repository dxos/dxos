//
// Copyright 2023 DXOS.org
//

import { exec } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import pkgUp from 'pkg-up';

import { asyncTimeout } from '@dxos/async';
import { failUndefined } from '@dxos/debug';

export const BIN_PATH = join(dirname(pkgUp.sync({ cwd: __dirname }) ?? failUndefined()), 'bin', 'run');

export const runCommand = async (command: string, cwd: string) => {
  mkdirSync(cwd, { recursive: true });
  const { stdout, stderr } = await asyncTimeout(promisify(exec)(`${BIN_PATH} ${command}`, { cwd: __dirname }), 20_000);
  if (stderr) {
    throw new Error(stderr);
  }

  return stdout;
};
