//
// Copyright 2026 DXOS.org
//

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { HarnessError, errorCode } from './workspace.ts';

/** Machine-wide: two measurements at once contend for the same cores and measure each other. */
export const LOCK_FILE = path.join(os.homedir(), '.cache', 'dxos-perf', 'measure.lock');

export type LockHolder = { pid: number; worktree: string; command: string; started: string };

const isHolder = (value: unknown): value is LockHolder =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'pid') === 'number' &&
  typeof Reflect.get(value, 'worktree') === 'string' &&
  typeof Reflect.get(value, 'command') === 'string' &&
  typeof Reflect.get(value, 'started') === 'string';

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errorCode(error) === 'EPERM';
  }
};

/** The live holder, if any; a lock whose process has died is stale and reads as free. */
export const lockHolder = (file = LOCK_FILE): LockHolder | undefined => {
  try {
    const holder: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return isHolder(holder) && alive(holder.pid) ? holder : undefined;
  } catch (error) {
    if (errorCode(error) === 'ENOENT' || error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
};

export type AcquireLockOptions = {
  worktree: string;
  command: string;
  /** How long to wait for the current holder; 0 refuses at once. */
  waitMs: number;
  file?: string;
  onWait?: (holder: LockHolder) => void;
};

/** Takes the lock, waiting for a live holder up to `waitMs`; returns the release function. */
export const acquireLock = async ({
  worktree,
  command,
  waitMs,
  file = LOCK_FILE,
  onWait,
}: AcquireLockOptions): Promise<() => void> => {
  mkdirSync(path.dirname(file), { recursive: true });
  const deadline = Date.now() + waitMs;
  let announced = false;
  for (;;) {
    const holder: LockHolder = { pid: process.pid, worktree, command, started: new Date().toISOString() };
    try {
      writeFileSync(file, JSON.stringify(holder), { flag: 'wx' });
      const release = () => {
        if (lockHolder(file)?.pid === process.pid) {
          rmSync(file, { force: true });
        }
      };
      process.once('exit', release);
      return release;
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') {
        throw error;
      }
    }

    const current = lockHolder(file);
    if (!current) {
      rmSync(file, { force: true });
      continue;
    }
    if (Date.now() >= deadline) {
      throw new HarnessError(
        `machine busy: pid ${current.pid} (${current.command}) in ${current.worktree} has measured since ${current.started}`,
      );
    }
    if (!announced) {
      onWait?.(current);
      announced = true;
    }
    await sleep(5_000);
  }
};
