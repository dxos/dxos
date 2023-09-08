//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { DaemonManager } from './daemon-manager';
import { TEST_DIR, neverEndingProcess } from './testing-utils';

describe('DaemonManager', () => {
  test('kill process by pid', async () => {
    const child = spawn('node', ['-e', `(${neverEndingProcess.toString()})()`]);
    const trigger = new Trigger();
    child.on('exit', () => {
      trigger.wake();
    });

    process.kill(child.pid!, 'SIGKILL');

    await trigger.wait({ timeout: 1_000 });
  });

  test('start/stop detached watchdog', async () => {
    const testId = Math.random();
    const logFile = join(TEST_DIR, `file-${testId}.log`);
    const errFile = join(TEST_DIR, `err-${testId}.log`);
    afterTest(() => clearFiles(logFile, errFile));

    const uid = 'test';

    // Start
    {
      const manager = new DaemonManager(TEST_DIR);
      await manager.start({
        uid,
        command: 'node',
        args: ['-e', `(${neverEndingProcess.toString()})()`],
        logFile,
        errFile,
      });

      await waitForExpect(() => {
        expect(existsSync(logFile)).to.be.true;
        const logs = readFileSync(logFile, { encoding: 'utf-8' });
        expect(logs).to.contain('neverEndingProcess started');
      }, 1000);
    }

    // Stop
    {
      const manager = new DaemonManager(TEST_DIR);
      const info = await manager.list();
      expect(info.length).to.equal(1);
      expect(info[0].running).to.be.true;
      expect(info[0].uid).to.equal(uid);
      expect(await manager.isRunning(uid)).to.be.true;

      await manager.stop(uid);

      await waitForExpect(() => {
        const logs = readFileSync(logFile, { encoding: 'utf-8' });
        expect(logs).to.contain('Stopped with exit code');
      }, 1000);
    }
  });
});
