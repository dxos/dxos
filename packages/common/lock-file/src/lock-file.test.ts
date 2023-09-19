//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { afterTest, beforeAll, describe, test } from '@dxos/test';

import { LockFile } from './lock-file';

chai.use(chaiAsPromised);

const TEST_DIR = '/tmp/dxos/testing/lock-file';

describe('LockFile', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  test('basic', async () => {
    const filename = join('/tmp', `lock-${Math.random()}.lock`);

    const handle = await LockFile.acquire(filename);
    await expect(LockFile.acquire(filename)).to.be.rejected;
    await LockFile.release(handle);

    const handle2 = await LockFile.acquire(filename);
    await LockFile.release(handle2);
  });

  test('released when process exits', async () => {
    const filename = join(TEST_DIR, `lock-${Math.random()}.lock`);
    afterTest(() => {
      if (existsSync(filename)) {
        unlinkSync(filename);
      }
    });

    const trigger = new Trigger();
    const processHandle = spawn('node', ['-e', `(${lockInProcess.toString()})(${JSON.stringify(filename)})`], {
      stdio: 'pipe',
    });

    {
      // Wait for process to start

      processHandle.stdout.on('data', (data: Uint8Array) => {
        expect(data.toString().trim()).to.equal('locked');
        trigger.wake();
      });
    }

    await trigger.wait({ timeout: 1_000 });

    await expect(LockFile.acquire(filename)).to.be.rejected;

    processHandle.stdin.write('close');
    processHandle.kill();

    // Wait for process to be killed
    await waitForExpect(async () => {
      expect(await LockFile.isLocked(filename)).to.be.false;
    });

    const handle = await LockFile.acquire(filename);
    await LockFile.release(handle);
  });

  test('spam with isLocked calls', async () => {
    const checksNumber = 1000;
    const filename = join('/tmp', `lock-${Math.random()}.lock`);

    for (const _ of Array(checksNumber).keys()) {
      const handle = await LockFile.acquire(filename);
      expect(await LockFile.isLocked(filename)).to.be.true;
      await LockFile.release(handle);
      expect(await LockFile.isLocked(filename)).to.be.false;
    }
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
  let fileHandle;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  open(filename, constants.O_CREAT).then((handle) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    flock(handle.fd, 'exnb', (err) => {
      if (err) {
        handle.close();
        console.error(err);
        return;
      }
      fileHandle = handle;
      console.log('locked');
      // Hang
      setTimeout(() => {}, 1_000_000);
    });
  });

  // Close file handle on stdin close.
  process.stdin.on('data', (data) => {
    if (data.toString().trim() === 'close') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fileHandle.close();
    }
  });
};
