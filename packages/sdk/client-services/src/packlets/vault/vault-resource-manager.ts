//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { ClientServicesHost } from '../services';

const LOCK_KEY = 'DXOS_COMPATIBILITY_LOCK';

enum Message {
  ACQUIRING = 'acquiring'
}

export class VaultResourceManager {
  private readonly _broadcastChannel = new BroadcastChannel('vault-resource-manager');
  private _releaseTrigger = new Trigger();

  constructor(private readonly _serviceHost: ClientServicesHost) {
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
    void navigator.locks.request(LOCK_KEY, { steal }, async () => {
      await this._serviceHost.open();
      acquired.wake();
      this._releaseTrigger = new Trigger();
      await this._releaseTrigger.wait();
      log('releasing lock...');
      await this._serviceHost.close();
      log('released lock');
    });
    await acquired.wait();
    log('recieved lock', { steal });
  }
}
