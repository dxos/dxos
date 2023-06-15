//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import pkgUp from 'pkg-up';

const throwError = (err: Error) => {
  throw err;
};

describe('CLI', () => {
  it('prints config', async () => {
    const packagePath = pkgUp.sync({ cwd: __dirname }) ?? throwError(new Error('package.json not found'));
    console.log('package.json', readFileSync(packagePath, { encoding: 'utf-8' }));

    const { stdout } = await promisify(exec)('npm exec dx config', { cwd: __dirname });
    expect(stdout).to.contain('"version": 1');
  }).timeout(5000);
});
