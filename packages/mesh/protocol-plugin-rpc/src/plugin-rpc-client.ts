//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, waitForCondition } from '@dxos/async';
import { Extension, Protocol } from '@dxos/protocol';
import { RpcPort } from '@dxos/rpc';

import { extensionName } from './extension-name';
import { createPort, SerializedObject } from './helpers';

export class PluginRpcClient {
  private _peer: Protocol | undefined;
  private _receive: Event<SerializedObject> = new Event();

  createExtension (): Extension {
    return new Extension(extensionName)
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setMessageHandler(this._onMessage.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  private async _onPeerConnect (peer: Protocol) {
    this._peer = peer;
    await peer.open();
  }

  private _onPeerDisconnect () {
    this._peer = undefined;
  }

  private async _onMessage (peer: Protocol, data: any) {
    this._receive.emit(data);
  }

  async close () {
    await this._peer?.close();
  }

  async getRpcPort (): Promise<RpcPort> {
    await waitForCondition(() => this._peer);
    assert(this._peer);
    const port = await createPort(this._peer, this._receive);
    return port;
  }
}
