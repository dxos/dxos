//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { Phoenix } from './phoenix';
import { TEST_DIR, clearFiles, neverEndingProcess } from './testing-utils';

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

  // Fails on CI
  test('start/stop detached watchdog', async () => {
    const runId = Math.random().toString();
    const pidFile = join(TEST_DIR, `pid-${runId}.pid`);
    const logFile = join(TEST_DIR, `file-${runId}.log`);
    const errFile = join(TEST_DIR, `err-${runId}.log`);
    afterTest(() => clearFiles(pidFile, logFile, errFile));

    // Start
    {
      const params = await Phoenix.start({
        profile: runId,
        command: 'node',
        args: ['-e', `(${neverEndingProcess.toString()})()`],
        maxRestarts: 0,
        pidFile,
        logFile,
        errFile,
      });

      await waitForExpect(() => {
        expect(existsSync(params.logFile)).to.be.true;
        const logs = readFileSync(params.logFile, { encoding: 'utf-8' });
        expect(logs).to.contain('neverEndingProcess started');
      }, 1000);
    }

    // Stop
    {
      const info = Phoenix.info(pidFile);
      expect(info.profile).to.equal(runId);

      await Phoenix.stop(pidFile);

      await waitForExpect(() => {
        const logs = readFileSync(logFile, { encoding: 'utf-8' });
        expect(logs).to.contain('Stopped with exit code');
      }, 1000);
    }
  });
});
