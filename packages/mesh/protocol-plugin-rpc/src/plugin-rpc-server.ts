//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { Extension, Protocol } from '@dxos/protocol';
import { RpcPort } from '@dxos/rpc';

import { extensionName } from './extension-name';
import { getPeerId } from './helpers';

type OnConnect = (port: RpcPort) => Promise<() => Promise<void> | void>

interface SerializedObject {
  data: Buffer
}

interface Connection {
  peer: Protocol,
  cleanup: () => Promise<void> | void,
  receive: Event<SerializedObject>
}

export class PluginRpcServer {
  private _peers: Map<string, Connection> = new Map();

  constructor (private _onConnect: OnConnect) {}

  createExtension (): Extension {
    return new Extension(extensionName)
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setMessageHandler(this._onMessage.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  private async _onPeerConnect (peer: Protocol) {
    const receive = new Event<SerializedObject>();

    const cleanup = await this._onConnect({
      send: () => {
        throw new Error('Port is not sendable');
      },
      subscribe: (cb) => {
        const adapterCallback = (obj: SerializedObject) => {
          cb(obj.data);
        };
        receive.on(adapterCallback);
        return () => receive.off(adapterCallback);
      }
    });

    await peer.open();

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
      this._peers.delete(peerId);
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
    for (const connection of this._peers.values()) {
      await connection.cleanup();
      await connection.peer.close();
    }
  }
}
