//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { afterTest, describe, test } from '@dxos/test';

import { TEST_DIR, clearFiles, neverEndingProcess } from './testing-utils';
import { WatchDog } from './watchdog';

describe('WatchDog', () => {
  test('Start/stop process', async () => {
    const runId = Math.random();
    const pidFile = join(TEST_DIR, `pid-${runId}.pid`);
    const logFile = join(TEST_DIR, `file-${runId}.log`);
    const errFile = join(TEST_DIR, `err-${runId}.log`);
    afterTest(() => clearFiles(pidFile, logFile, errFile));

    const watchDog = new WatchDog({
      command: 'node',
      args: ['-e', `(${neverEndingProcess.toString()})()`],
      pidFile,
      logFile,
      errFile,
    });

    expect(existsSync(pidFile)).to.be.false;
    await watchDog.start();

    expect(existsSync(pidFile)).to.be.true;

    await watchDog.kill();
    expect(existsSync(pidFile)).to.be.false;
  });
});
