//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

describe('CLI', () => {
  it('prints config', async () => {
    const { stdout, stderr } = await promisify(exec)('npm exec dx', { cwd: __dirname });
    stderr && console.error('stderr', stderr);
    expect(stdout).to.contain('DXOS CLI');
  }).timeout(5000);
});
