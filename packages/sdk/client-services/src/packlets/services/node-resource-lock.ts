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
    if (lockfile.checkSync(getLockFilePath({ root: this._root, lockKey: this._lockKey }))) {
      throw new Error(`Lock already acquired: ${this._lockKey}`);
    }
    lockfile.lockSync(getLockFilePath({ root: this._root, lockKey: this._lockKey }));
    await this._onAcquire?.();
    log('acquired lock');
  }

  async release() {
    if (!lockfile.checkSync(getLockFilePath({ root: this._root, lockKey: this._lockKey }))) {
      throw new Error(`Lock already acquired: ${this._lockKey}`);
    }
    lockfile.unlockSync(getLockFilePath({ root: this._root, lockKey: this._lockKey }));
    await this._onRelease?.();
  }
}
const getLockFilePath = ({ lockKey, root }: { lockKey: string; root: string }) => {
  return path.join(root, `${lockKey}.lock`);
};

export const isLocked = ({ lockKey, root }: { lockKey: string; root: string }) =>
  lockfile.checkSync(getLockFilePath({ lockKey, root }));
