//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';
import { EventEmitter } from 'events';

import type { DevtoolsBridge } from '@dxos/devtools';

Bridge.setNamespace('dxos.devtools');
Bridge.allowWindowMessaging('dxos.devtools');

export default class BridgeProxy extends EventEmitter implements DevtoolsBridge {
  constructor () {
    super();
    this._init();
  }

  _init () {
    Bridge.onMessage('api.ready', () => {
      this.emit('api', true);
    });

    Bridge.onMessage('api.timeout', () => {
      this.emit('api', false);
    });
  }

  async injectClientScript () {
    await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  }

  async send (message: string, payload: any = {}) {
    return Bridge.sendMessage(message, payload, 'window');
  }

  async openStream (channel: string) {
    return Bridge.openStream(channel, 'window');
  }

  listen (message: string, fn: (data: any) => void) {
    Bridge.onMessage(message, fn);
  }

  getConfig () {
    return Bridge.sendMessage('config', {}, 'window');
  }
}
