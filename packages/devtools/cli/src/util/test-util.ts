//
// Copyright 2023 DXOS.org
//

import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { exec } from './exec';

export const runCommand = async (command: string, cwd: string) => {
  const bin = path.join(__dirname, '../../bin/run');
  mkdirSync(cwd, { recursive: true });

  return await exec(`${bin} ${command}`, { cwd, shell: false });
};
