//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

import { sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { LockFile } from './lock-file';

chai.use(chaiAsPromised);

describe('LockFile', () => {
  test('basic', async () => {
    const filename = join('/tmp', `lock-${Math.random()}.lock`);

    const handle = await LockFile.acquire(filename);
    await expect(LockFile.acquire(filename)).to.be.rejected;
    await LockFile.release(handle);

    const handle2 = await LockFile.acquire(filename);
    await LockFile.release(handle2);
  });

  test('released when process exists', async () => {
    const filename = join('/tmp', `lock-${Math.random()}.lock`);
    const processHandle = spawn('node', ['-e', `(${lockInProcess.toString()})(${JSON.stringify(filename)})`], {
      stdio: 'inherit',
    });

    // Wait for process to start
    await sleep(200);
    await expect(LockFile.acquire(filename)).to.be.rejected;

    processHandle.kill();

    // Wait for process to be killed
    await sleep(200);

    const handle = await LockFile.acquire(filename);
    await LockFile.release(handle);
  });
});

// NOTE: Self-contained so when function.toString is called the code runs.
const lockInProcess = (filename: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { open } = require('node:fs/promises');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { constants } = require('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { flock } = require('fs-ext');

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  open(filename, constants.O_CREAT).then((handle) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    flock(handle.fd, 'exnb', (err) => {
      if (err) {
        console.error(err);
        return;
      }
      // Hang
      setTimeout(() => {}, 1_000_000);
    });
  });
};
