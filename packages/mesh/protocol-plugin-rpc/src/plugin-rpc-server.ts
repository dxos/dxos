//
// Copyright 2021 DXOS.org
//

import { Event, waitForCondition } from '@dxos/async';
import { Extension, Protocol } from '@dxos/protocol';
import { RpcPort } from '@dxos/rpc';

import { extensionName } from './extension-name';
import { getPeerId } from './helpers';

type OnConnect = (port: RpcPort) => Promise<() => Promise<void> | void>

interface Connection {
  peer: Protocol,
  cleanup: () => Promise<void> | void,
  receive: Event<Uint8Array>
}

export class PluginRpcServer {
  private _peers: Map<string, Connection> = new Map();

  constructor (private _onConnect: OnConnect) {}

  createExtension(): Extension {
    return new Extension(extensionName)
    .setHandshakeHandler(this._onPeerConnect.bind(this))
    .setMessageHandler(this._onMessage.bind(this))
    .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  private async _onPeerConnect (peer: Protocol) {
    const receive = new Event<Uint8Array>();
  
    const cleanup = await this._onConnect({
      send: () => {
        throw new Error('Port is not sendable');
      },
      subscribe: (cb) => {
        receive.on(cb);
        return () => receive.off(cb);
      }
    });
  
    const peerId = getPeerId(peer);
    
    this._peers.set(peerId, {
      peer,
      cleanup,
      receive
    });
  }

  private async _onPeerDisconnect (peer: Protocol) {
    const peerId = getPeerId(peer);
    const connection = this._peers.get(peerId);
    if (connection) {
      await connection.cleanup();
    }
  }
  
  private _onMessage (peer: Protocol, data: any) {
    const peerId = getPeerId(peer);
    const connection = this._peers.get(peerId);
    if (connection) {
      connection.receive.emit(data);
    }
  }

  async close () {
    await Promise.all([]);
  }
}
