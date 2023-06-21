//
// Copyright 2023 DXOS.org
//

import lockfile from 'lockfile';
import path from 'node:path';

import { Trigger } from '@dxos/async';
import { log, logInfo } from '@dxos/log';

import { ResourceLock, ResourceLockOptions } from '../services';

export type NodeResourceLockOptions = ResourceLockOptions & {
  root: string;
};

export class NodeResourceLock implements ResourceLock {
  private readonly _root: string;
  private readonly _lockKey: string;
  private readonly _onAcquire: ResourceLockOptions['onAcquire'];
  private readonly _onRelease: ResourceLockOptions['onRelease'];
  private _releaseTrigger = new Trigger();

  constructor({ root, lockKey, onAcquire, onRelease }: NodeResourceLockOptions) {
    this._root = root;
    this._lockKey = lockKey;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
  }

  @logInfo
  get lockKey() {
    return this._lockKey;
  }

  async acquire() {
    log('acquiring lock...');
    if (lockfile.checkSync(this._getLockFilePath())) {
      throw new Error(`Lock already acquired: ${this._lockKey}`);
    }
    lockfile.lockSync(this._getLockFilePath());
    await this._onAcquire?.();
    log('acquired lock');
  }

  async release() {
    if (!lockfile.checkSync(this._getLockFilePath())) {
      throw new Error(`Lock already acquired: ${this._lockKey}`);
    }
    lockfile.unlockSync(this._getLockFilePath());
    await this._onRelease?.();
  }

  private _getLockFilePath() {
    return path.join(this._root, this._lockKey);
  }
}

export const isLocked = ({ lockKey, root }: { lockKey: string; root: string }) =>
  lockfile.checkSync(path.join(root, lockKey));
