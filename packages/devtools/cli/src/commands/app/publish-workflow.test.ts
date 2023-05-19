//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'path';

import { describe, test } from '@dxos/test';

describe.only('App', () => {
  const tmpFolder = path.join(__dirname, '../../../tmp/dx');

  test('create', async () => {
    const appName = 'test-app';
    expect(fs.existsSync(path.join(tmpFolder, appName, 'dx.yml'))).to.be.true;
  });
});
