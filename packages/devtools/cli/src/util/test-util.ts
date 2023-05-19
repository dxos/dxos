//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { exec } from './exec';

export const runCommand = async (command: string, cwd: string) => {
  const bin = path.join(__dirname, '../../bin/run');

  return await exec(`
    mkdir -p ${cwd} &&
    pushd ${cwd} &&
    ${bin} ${command} &&
    popd
  `);
};
