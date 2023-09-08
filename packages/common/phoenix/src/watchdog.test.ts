//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { mkdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { dirname } from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { LockFile } from '@dxos/lock-file';
import { describe, test } from '@dxos/test';

import { neverEndingProcess } from './testing-util';
import { WatchDog } from './watchdog';

describe('WatchDog', () => {
  test.repeat(1000)('Start/stop process', async () => {
    const lockFile = '/tmp/dxos/testing/phoenix/file.lock';

    // Create lock file.
    {
      mkdirSync(dirname(lockFile), { recursive: true });
      await open(lockFile, 'w');
    }

    const watchDog = new WatchDog({
      command: 'node',
      args: ['-e', `(${neverEndingProcess.toString()})()`],
      lockFile,
      logFile: '/tmp/dxos/testing/phoenix/file.log',
      errFile: '/tmp/dxos/testing/phoenix/err.log',
    });

    expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.false;
    await watchDog.start();

    expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.true;

    await watchDog.stop();
    expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.false;
  });
});
