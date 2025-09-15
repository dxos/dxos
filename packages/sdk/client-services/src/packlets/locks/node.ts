//
// Copyright 2023 DXOS.org
//

import { check, lock } from 'proper-lockfile';

import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';

import { type ResourceLock, type ResourceLockOptions } from './resource-lock';

// TODO(mykola): Factor out.
export class Lock implements ResourceLock {
  private readonly _lockPath: string;
  private readonly _onAcquire: ResourceLockOptions['onAcquire'];
  private readonly _onRelease: ResourceLockOptions['onRelease'];
  private _release?: () => Promise<void>;

  constructor({ lockKey: lockPath, onAcquire, onRelease }: ResourceLockOptions) {
    this._lockPath = lockPath;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
  }

  @logInfo
  get lockKey() {
    return this._lockPath;
  }

  async acquire(): Promise<void> {
    log('acquiring lock...');
    this._release = await lock(this._lockPath);
    await this._onAcquire?.();

    log('acquired lock');
  }

  async release(): Promise<void> {
    await this._onRelease?.();
    invariant(this._release, 'Lock is not acquired');
    await this._release();
  }
}

export const isLocked = (lockPath: string) => check(lockPath);
