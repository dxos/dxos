//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { waitForCondition } from '@dxos/async';
import { Extension, Protocol } from '@dxos/protocol';
import { RpcPort } from '@dxos/rpc';

import { extensionName } from './extension-name';

export class PluginRpcClient {
  private _peer: Protocol | undefined;

  createExtension (): Extension {
    return new Extension(extensionName)
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  private async _onPeerConnect (peer: Protocol) {
    this._peer = peer;
    await peer.open();
  }

  private _onPeerDisconnect () {
    this._peer = undefined;
  }

  async waitForConnection () {
    await waitForCondition(() => !!this._peer?.connected);
  }

  async send (message: Uint8Array) {
    assert(this._peer?.connected, 'Peer is not connected');
    const extension = this._peer.getExtension(extensionName);
    assert(extension, 'Extension is not set');
    await extension.send(message);
  }

  async close () {
    await this._peer?.close();
  }

  getRpcPort (): RpcPort {
    return {
      send: this.send.bind(this),
      subscribe: () => {
        throw new Error('Port is not subscribable');
      }
    };
  }
}
