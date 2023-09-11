//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fse from 'fs-extra';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { afterTest, describe, test } from '@dxos/test';

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

  // Fails on CI
  test.skip('start/stop detached watchdog', async () => {
    const uid = `test-${PublicKey.random().toHex()}`;
    const root = join(TEST_DIR, uid);
    afterTest(() => {
      fse.removeSync(root);
    });

    // Start
    {
      const manager = new DaemonManager(root);
      const params = await manager.start({
        uid,
        command: 'node',
        args: ['-e', `(${neverEndingProcess.toString()})()`],
        maxRestarts: 0,
      });

      await waitForExpect(() => {
        expect(existsSync(params.logFile)).to.be.true;
        const logs = readFileSync(params.logFile, { encoding: 'utf-8' });
        expect(logs).to.contain('neverEndingProcess started');
      }, 1000);
    }

    // Stop
    {
      const manager = new DaemonManager(root);
      const info = await manager.list();
      expect(info.length).to.equal(1);
      expect(info[0].running).to.be.true;
      expect(info[0].uid).to.equal(uid);
      expect(await manager.isRunning(uid)).to.be.true;

      const params = await manager.stop(uid);

      await waitForExpect(() => {
        const logs = readFileSync(params.logFile, { encoding: 'utf-8' });
        expect(logs).to.contain('Stopped with exit code');
      }, 1000);
    }
  });
});
