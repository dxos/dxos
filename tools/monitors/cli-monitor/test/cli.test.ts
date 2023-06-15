//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import pkgUp from 'pkg-up';

const throwError = (err: Error) => {
  throw err;
};

describe('CLI', () => {
  it('prints config', async () => {
    const packagePath = pkgUp.sync({ cwd: __dirname }) ?? throwError(new Error('package.json not found'));
    console.log('package.json devDeps', JSON.parse(readFileSync(packagePath, { encoding: 'utf-8' })).devDependencies);
    console.log(
      'cli version',
      JSON.parse(
        readFileSync(join(dirname(packagePath), 'node_modules', '@dxos/cli', 'package.json'), { encoding: 'utf-8' }),
      ).version,
    );

    console.log('HOME', typeof process !== 'undefined' ? process?.env?.HOME : 'tmp');

    const { stdout, stderr } = await promisify(exec)('npm exec dx config', { cwd: __dirname });
    console.log('stderr', stderr);
    expect(stdout).to.contain('"version": 1');
  }).timeout(5000);
});
