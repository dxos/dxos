//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'path';

import { describe, test } from '@dxos/test';

import { runCommand } from '../../util';

describe('App', () => {
  const tmpFolder = path.join(__dirname, '../../../tmp/dx');

  afterEach(() => {
    fs.rmSync(tmpFolder, { recursive: true, force: true });
  });

  test('create', async () => {
    const appName = 'test-app';
    await runCommand(`app create ${appName}`, tmpFolder);
    expect(fs.existsSync(path.join(tmpFolder, appName, 'dx.yml'))).to.be.true;
  });
});
