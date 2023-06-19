//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

describe('CLI', () => {
  it('prints config', async () => {
    const { stdout } = await promisify(exec)('npm exec dx config', { cwd: __dirname });
    expect(stdout).to.contain('"version": 1');
  }).timeout(5000);
});
