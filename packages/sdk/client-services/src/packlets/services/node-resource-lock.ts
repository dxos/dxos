//
// Copyright 2023 DXOS.org
//

import lockfile from 'lockfile';

import { Trigger } from '@dxos/async';
import { log, logInfo } from '@dxos/log';

import { ResourceLock, ResourceLockOptions } from '../services';

export class NodeResourceLock implements ResourceLock {
  private readonly _lockPath: string;
  private readonly _onAcquire: ResourceLockOptions['onAcquire'];
  private readonly _onRelease: ResourceLockOptions['onRelease'];
  private _releaseTrigger = new Trigger();

  constructor({ lockKey: lockPath, onAcquire, onRelease }: ResourceLockOptions) {
    this._lockPath = lockPath;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
  }

  @logInfo
  get lockKey() {
    return this._lockPath;
  }

  async acquire() {
    log('acquiring lock...');
    if (lockfile.checkSync(this.lockKey)) {
      throw new Error(`Lock already acquired: ${this._lockPath}`);
    }
    lockfile.lockSync(this._lockPath);
    await this._onAcquire?.();
    log('acquired lock');
  }

  async release() {
    if (!lockfile.checkSync(this._lockPath) {
      throw new Error(`Lock already acquired: ${this._lockPath}`);
    }
    lockfile.unlockSync(this._lockPath;
    await this._onRelease?.();
  }
}

export const isLocked = (lockPath: string) =>
  lockfile.checkSync(lockPath);
