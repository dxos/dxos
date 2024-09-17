//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { runCommand } from '@dxos/cli-base';

describe('App', () => {
  const tmpFolder = './tmp/packages/devtools/cli/';
  const cleanUp = () => {
    fs.rmSync(tmpFolder, { recursive: true, force: true });
  };

  beforeEach(() => cleanUp());
  afterEach(() => cleanUp());

  // TODO(mykola): Fails on CI.
  test.skip('create', async () => {
    const appName = 'test-app';
    void runCommand(`app create ${appName}`, tmpFolder);
    await expect.poll(() => fs.existsSync(path.join(tmpFolder, appName, 'dx.yml'))).toBe(true);
  });
});
