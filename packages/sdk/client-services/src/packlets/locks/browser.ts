//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, Trigger } from '@dxos/async';
import { RESOURCE_LOCK_TIMEOUT } from '@dxos/client-protocol';
import { log, logInfo } from '@dxos/log';

import { type ResourceLock, type ResourceLockOptions } from './resource-lock';

enum Message {
  ACQUIRING = 'acquiring',
}

// TODO(mykola): Factor out.
// TODO(burdon): Extend to support locking for web and NodeJS (use npm lockfile). Use to lock agents.
export class Lock implements ResourceLock {
  private readonly _broadcastChannel = new BroadcastChannel('vault-resource-lock');
  private readonly _lockKey: string;
  private readonly _onAcquire: ResourceLockOptions['onAcquire'];
  private readonly _onRelease: ResourceLockOptions['onRelease'];
  private _releaseTrigger = new Trigger();

  constructor({ lockKey, onAcquire, onRelease }: ResourceLockOptions) {
    this._lockKey = lockKey;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
    this._broadcastChannel.onmessage = this._onMessage.bind(this);
  }

  @logInfo
  get lockKey() {
    return this._lockKey;
  }

  async acquire(): Promise<void> {
    this._broadcastChannel.postMessage({
      message: Message.ACQUIRING,
    });

    try {
      log('aquiring lock...');
      await asyncTimeout(this._requestLock(), RESOURCE_LOCK_TIMEOUT);
      log('acquired lock');
    } catch {
      log('stealing lock...');
      await this._requestLock(true);
      log('stolen lock');
    }
  }

  async release(): Promise<void> {
    this._releaseTrigger.wake();
  }

  private _onMessage(event: MessageEvent<any>): void {
    if (event.data.message === Message.ACQUIRING) {
      this._releaseTrigger.wake();
    }
  }

  private async _requestLock(steal = false): Promise<void> {
    log('requesting lock...', { steal });
    const acquired = new Trigger();

    void navigator.locks
      .request(this._lockKey, { steal }, async () => {
        await this._onAcquire?.();
        acquired.wake();
        this._releaseTrigger = new Trigger();
        await this._releaseTrigger.wait();
        log('releasing lock...');
        await this._onRelease?.();
        log('released lock');
      })
      .catch(async () => {
        await this._onRelease?.();
      });

    await acquired.wait();
    log('recieved lock', { steal });
  }
}

// TODO(mykola): Implement.
export const isLocked = (lockPath: string) => {
  throw new Error('Not implemented');
};
