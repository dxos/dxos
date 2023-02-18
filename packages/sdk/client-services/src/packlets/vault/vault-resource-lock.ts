//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { MaybePromise } from '@dxos/util';

enum Message {
  ACQUIRING = 'acquiring'
}

export type VaultResourceLockOptions = {
  lockKey: string;
  onAcquire?: () => MaybePromise<void>;
  onRelease?: () => MaybePromise<void>;
};

export class VaultResourceLock {
  private readonly _broadcastChannel = new BroadcastChannel('vault-resource-lock');
  private readonly _lockKey: string;
  private readonly _onAcquire: VaultResourceLockOptions['onAcquire'];
  private readonly _onRelease: VaultResourceLockOptions['onRelease'];
  private _releaseTrigger = new Trigger();

  constructor({ lockKey, onAcquire, onRelease }: VaultResourceLockOptions) {
    this._lockKey = lockKey;
    this._onAcquire = onAcquire;
    this._onRelease = onRelease;
    this._broadcastChannel.onmessage = this._onMessage.bind(this);
  }

  async acquire() {
    this._broadcastChannel.postMessage({
      message: Message.ACQUIRING
    });

    try {
      await asyncTimeout(this._requestLock(), 3_000);
    } catch {
      await this._requestLock(true);
    }
  }

  async release() {
    this._releaseTrigger.wake();
  }

  private _onMessage(event: MessageEvent<any>) {
    if (event.data.message === Message.ACQUIRING) {
      this._releaseTrigger.wake();
    }
  }

  private async _requestLock(steal = false) {
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
