//
// Copyright 2023 DXOS.org
//

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { LockFile } from './lock-file';

const TEST_DIR = '/tmp/dxos/testing/lock-file';
const TEMP_TEST_DIR = join(tmpdir(), 'lock-file-test-' + Date.now());

describe('LockFile', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEMP_TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEMP_TEST_DIR, { recursive: true, force: true });
  });

  test('basic', async () => {
    const filename = join('/tmp', `lock-${Math.random()}.lock`);

    const handle = await LockFile.acquire(filename);
    await expect(LockFile.acquire(filename)).rejects.toBeInstanceOf(Error);
    await LockFile.release(handle);

    const handle2 = await LockFile.acquire(filename);
    await LockFile.release(handle2);
  });

  test('released when process exits', { timeout: 10_000 }, async () => {
    const filename = join(TEST_DIR, `lock-${Math.random()}.lock`);
    onTestFinished(() => {
      if (existsSync(filename)) {
        unlinkSync(filename);
      }
    });

    const trigger = new Trigger();
    const processHandle = spawn('vite-node', [new URL('./locker-subprocess.ts', import.meta.url).pathname, filename], {
      stdio: 'pipe',
    });

    {
      // Wait for process to start
      processHandle.stdout.on('data', (data: Uint8Array) => {
        process.stdout.write(data);
        if (data.toString().trim().startsWith('#')) {
          expect(data.toString().trim()).to.equal('# locked');
          trigger.wake();
        }
      });
      processHandle.on('exit', (code) => {
        trigger.throw(new Error(`Process exited pre with code ${code}`));
      });
    }

    await trigger.wait({ timeout: 5_000 });

    await expect(LockFile.acquire(filename)).rejects.toBeInstanceOf(Error);

    processHandle.stdin.write('close');

    // Wait for process to be killed
    await expect.poll(async () => await LockFile.isLocked(filename)).toBe(false);

    const handle = await LockFile.acquire(filename);
    await LockFile.release(handle);
  });

  test('released when process killed with SIGKILL', { timeout: 10_000 }, async () => {
    const filename = join(TEST_DIR, `lock-${Math.random()}.lock`);
    onTestFinished(() => {
      if (existsSync(filename)) {
        unlinkSync(filename);
      }
    });

    const trigger = new Trigger();
    const processHandle = spawn('vite-node', [new URL('./locker-subprocess.ts', import.meta.url).pathname, filename], {
      stdio: 'pipe',
    });

    {
      // Wait for process to start
      processHandle.stdout.on('data', (data: Uint8Array) => {
        process.stdout.write(data);
        if (data.toString().trim().startsWith('#')) {
          expect(data.toString().trim()).to.equal('# locked');
          trigger.wake();
        }
      });
      processHandle.on('exit', (code) => {
        trigger.throw(new Error(`Process exited pre with code ${code}`));
      });
    }

    await trigger.wait({ timeout: 5_000 });

    await expect(LockFile.acquire(filename)).rejects.toBeInstanceOf(Error);

    processHandle.kill('SIGKILL');

    // Wait for process to be killed
    await expect.poll(async () => await LockFile.isLocked(filename)).toBe(false);

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

  // New tests merged from lock-file.test.ts
  test('should acquire and release lock', async () => {
    const lockFile = join(TEMP_TEST_DIR, 'test.lock');
    const handle = await LockFile.acquire(lockFile);
    expect(handle).toBeDefined();
    expect(handle.fd).toBeGreaterThan(0);

    // Lock should be held
    await expect(LockFile.isLocked(lockFile)).resolves.toBe(true);

    await LockFile.release(handle);

    // Lock should be released
    await expect(LockFile.isLocked(lockFile)).resolves.toBe(false);
  });

  test('should fail to acquire lock when already locked', async () => {
    const lockFile = join(TEMP_TEST_DIR, 'test2.lock');
    const handle = await LockFile.acquire(lockFile);

    // Try to acquire again - should fail
    await expect(LockFile.acquire(lockFile)).rejects.toThrow('flock failed');

    await LockFile.release(handle);
  });

  test('isLocked should return false for non-existent file', async () => {
    const nonExistent = join(TEMP_TEST_DIR, 'non-existent.lock');
    await expect(LockFile.isLocked(nonExistent)).resolves.toBe(false);
  });

  test('should handle concurrent lock attempts', async () => {
    const lockFile = join(TEMP_TEST_DIR, 'test3.lock');
    const handle = await LockFile.acquire(lockFile);

    // Multiple attempts to acquire should all fail
    const attempts = Array(5)
      .fill(0)
      .map(() => LockFile.acquire(lockFile).catch((err) => err));

    const results = await Promise.all(attempts);

    // All attempts should have failed
    results.forEach((result) => {
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('flock failed');
    });

    await LockFile.release(handle);
  });
});
