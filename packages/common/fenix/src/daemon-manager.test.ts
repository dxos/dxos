//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Trigger, asyncTimeout } from '@dxos/async';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { DaemonManager } from './daemon-manager';
import { neverEndingProcess } from './testing-util';

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

  test.skip('start/stop daemon', async () => {
    const manager = new DaemonManager();
    manager.start('node', ['-e', `(${neverEndingProcess.toString()})()`]);
  });
});
