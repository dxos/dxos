//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { Extension, Protocol } from '@dxos/protocol';
import { RpcPort } from '@dxos/rpc';

type OnConnect = (port: RpcPort, peerId: string) => Promise<() => Promise<void> | void>

interface SerializedObject {
  data: Buffer
}

interface Connection {
  peer: Protocol,
  cleanup: () => Promise<void> | void,
  receive: Event<SerializedObject>
}

export const getPeerId = (peer: Protocol) => {
  const { peerId } = peer.getSession() ?? {};
  return peerId as string;
};

export const createPort = async (peer: Protocol, receive: Event<SerializedObject>): Promise<RpcPort> => {
  return {
    send: async (msg) => {
      assert(peer.connected, 'Peer is not connected');
      const extension = peer.getExtension(PluginRpc.extensionName);
      assert(extension, 'Extension is not set');
      await extension.send(msg);
    },
    subscribe: (cb) => {
      const adapterCallback = (obj: SerializedObject) => {
        cb(obj.data);
      };
      receive.on(adapterCallback);
      return () => receive.off(adapterCallback);
    }
  };
};

export class PluginRpc {
  static extensionName = 'dxos.protocol.rpc';

  private _peers: Map<string, Connection> = new Map();

  constructor (private _onConnect: OnConnect) {}

  createExtension (): Extension {
    return new Extension(PluginRpc.extensionName)
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setMessageHandler(this._onMessage.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  private async _onPeerConnect (peer: Protocol) {
    const peerId = getPeerId(peer);
    const receive = new Event<SerializedObject>();

    const port = await createPort(peer, receive);
    const cleanup = await this._onConnect(port, peerId);

    await peer.open();

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
