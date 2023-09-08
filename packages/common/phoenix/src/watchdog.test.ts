//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { join } from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { LockFile } from '@dxos/lock-file';
import { afterTest, describe, test } from '@dxos/test';

import { TEST_DIR, clearFiles, neverEndingProcess } from './testing-utils';
import { WatchDog } from './watchdog';

describe('WatchDog', () => {
  test('Start/stop process', async () => {
    const runId = Math.random();
    const lockFile = join(TEST_DIR, `lock-${runId}.lock`);
    const logFile = join(TEST_DIR, `file-${runId}.log`);
    const errFile = join(TEST_DIR, `err-${runId}.log`);
    afterTest(() => clearFiles(lockFile, logFile, errFile));

    const watchDog = new WatchDog({
      uid: 'test',
      command: 'node',
      args: ['-e', `(${neverEndingProcess.toString()})()`],
      lockFile,
      logFile,
      errFile,
    });

    expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.false;
    await watchDog.start();

    expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.true;

    await watchDog.stop();
    expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.false;
  });
});
