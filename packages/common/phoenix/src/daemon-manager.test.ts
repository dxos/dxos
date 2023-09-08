//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { spawn, exec } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import waitForExpect from 'wait-for-expect';

import { Trigger, asyncTimeout } from '@dxos/async';
import { LockFile } from '@dxos/lock-file';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { DaemonManager } from './daemon-manager';
import { TEST_DIR, neverEndingProcess } from './testing-utils';

describe('DaemonManager', () => {
  test('kill process by pid', async () => {
    const process = spawn('node', ['-e', `(${neverEndingProcess.toString()})()`]);
    const trigger = new Trigger();
    process.on('exit', () => {
      trigger.wake();
    });

    log.info(process.pid!.toString());

    const { stdout, stderr } = await asyncTimeout(promisify(exec)(`kill -9 ${process.pid}`), 20_000);
    if (stderr) {
      throw new Error(stderr);
    }

    expect(stdout).to.equal('');
    await trigger.wait({ timeout: 1_000 });
  });

  describe('start/stop watchdog', () => {
    // This describe section will start and then stop the watchdog process in separate test suits.
    const testId = Math.random();
    const lockFile = join(TEST_DIR, `lock-${testId}.lock`);
    const logFile = join(TEST_DIR, `file-${testId}.log`);
    const errFile = join(TEST_DIR, `err-${testId}.log`);
    // afterAll(() => clearFiles(lockFile, logFile, errFile));

    test('start detached watchdog', async () => {
      const manager = new DaemonManager();
      expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.false;
      await manager.start({
        command: 'node',
        args: ['-e', `(${neverEndingProcess.toString()})()`],
        lockFile,
        logFile,
        errFile,
      });
      expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.true;

      await waitForExpect(() => {
        expect(existsSync(logFile)).to.be.true;
      });

      const logs = readFileSync(logFile, { encoding: 'utf-8' });
      expect(logs).to.contain('started');
    });

    test('stop detached watchdog', async () => {
      const manager = new DaemonManager();
      expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.true;
      await manager.stop(lockFile);

      expect(await asyncTimeout(LockFile.isLocked(lockFile), 1000)).to.be.false;
      const logs = readFileSync(logFile, { encoding: 'utf-8' });
      expect(logs).to.contain('signal: SIGINT');
    });
  });
});
