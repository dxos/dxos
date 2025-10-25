//
// Copyright 2023 DXOS.org
//

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { Phoenix } from './phoenix';
import { TEST_DIR, clearFiles, neverEndingProcess } from './testing-utils';

describe.skipIf(process.env.CI)('DaemonManager', () => {
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
    onTestFinished(() => clearFiles(pidFile, logFile, errFile));

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

      await expect.poll(() => existsSync(params.logFile), { timeout: 1000 }).toBe(true);
      const logs = readFileSync(params.logFile, { encoding: 'utf-8' });
      expect(logs).to.contain('neverEndingProcess started');
    }

    // Stop
    {
      const info = Phoenix.info(pidFile);
      expect(info.profile).to.equal(runId);

      await Phoenix.stop(pidFile);
      await expect.poll(() => readFileSync(logFile, { encoding: 'utf-8' })).toContain('Stopped with exit code');
    }
  });
});
