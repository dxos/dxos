//
// Copyright 2023 DXOS.org
//

import { type FileHandle } from 'node:fs/promises';

import { invariant } from '@dxos/invariant';
import { LockFile } from '@dxos/lock-file';
import { log, logInfo } from '@dxos/log';

import { type ResourceLock, type ResourceLockOptions } from './resource-lock';

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

  async acquire(): Promise<void> {
    log('acquiring lock...');
    this._fileHandle = await LockFile.acquire(this._lockPath);

    await this._onAcquire?.();

    log('acquired lock');
  }

  async release(): Promise<void> {
    await this._onRelease?.();
    invariant(this._fileHandle, 'Lock is not acquired');
    await LockFile.release(this._fileHandle);
  }
}

export const isLocked = (lockPath: string) => LockFile.isLocked(lockPath);
