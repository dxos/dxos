//
// Copyright 2023 DXOS.org
//

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, onTestFinished, test } from 'vitest';

import { TEST_DIR, clearFiles, neverEndingProcess } from './testing-utils';
import { WatchDog } from './watchdog';

describe.skipIf(process.env.CI)('WatchDog', () => {
  test('Start/stop process', async () => {
    const runId = Math.random();
    const pidFile = join(TEST_DIR, `pid-${runId}.pid`);
    const logFile = join(TEST_DIR, `file-${runId}.log`);
    const errFile = join(TEST_DIR, `err-${runId}.log`);
    onTestFinished(() => clearFiles(pidFile, logFile, errFile));

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
