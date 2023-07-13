//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import { FileHandle } from 'node:fs/promises';

import { LockFile } from '@dxos/lock-file';
import { log, logInfo } from '@dxos/log';

import { ResourceLock, ResourceLockOptions } from './resource-lock';

// TODO(mykola): Factor out.
export class Lock implements ResourceLock {
  private readonly _lockPath: string;
  private readonly _onAcquire: ResourceLockOptions['onAcquire'];
  private readonly _onRelease: ResourceLockOptions['onRelease'];
  private _fileHandle?: FileHandle;

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
    this._fileHandle = await LockFile.acquire(this._lockPath);

    await this._onAcquire?.();

    log('acquired lock');
  }

  async release() {
    await this._onRelease?.();
    assert(this._fileHandle, 'Lock is not acquired');
    await LockFile.release(this._fileHandle);
  }
}

export const isLocked = (lockPath: string) => LockFile.isLocked(lockPath);
