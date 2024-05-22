//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'path';
import waitForExpect from 'wait-for-expect';

import { describe, test } from '@dxos/test';

import { runCommand } from '../../util';

describe('App', () => {
  const tmpFolder = './tmp/packages/devtools/cli/';
  const cleanUp = () => {
    fs.rmSync(tmpFolder, { recursive: true, force: true });
  };

  beforeEach(() => cleanUp());
  afterEach(() => cleanUp());

  // TODO(mykola): Fails on CI.
  test('create', async () => {
    const appName = 'test-app';
    void runCommand(`app create ${appName}`, tmpFolder);
    await waitForExpect(() => {
      expect(fs.existsSync(path.join(tmpFolder, appName, 'dx.yml'))).to.be.true;
    }, 5_000);
  })
    .tag('flaky')
    .timeout(5_000);
});
