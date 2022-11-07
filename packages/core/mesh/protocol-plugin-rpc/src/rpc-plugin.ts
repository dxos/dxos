//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { log } from '@dxos/log';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { RpcPort } from '@dxos/rpc';
import { MaybePromise } from '@dxos/util';

type OnConnect = (port: RpcPort, peerId: string) => MaybePromise<(() => MaybePromise<void>) | void>;

type SerializedObject = {
  data: Buffer;
};

type Connection = {
  peer: Protocol;
  cleanup?: () => Promise<void> | void;
  receive: Event<SerializedObject>;
};

/**
 * Protocol plug-in to handle direct RPC connections.
 */
export class RpcPlugin {
  static readonly EXTENSION = 'dxos.mesh.protocol.rpc';

  private readonly _peers: Map<string, Connection> = new Map();

  // prettier-ignore
  constructor(
    private readonly _onConnect: OnConnect
  ) {}

  createExtension(): Extension {
    return new Extension(RpcPlugin.EXTENSION)
      .setHandshakeHandler(this._onPeerConnect.bind(this))
      .setMessageHandler(this._onMessage.bind(this))
      .setCloseHandler(this._onPeerDisconnect.bind(this));
  }

  async close() {
    for (const connection of this._peers.values()) {
      await connection.cleanup?.();
      await connection.peer.close();
    }
  }

  private async _onPeerConnect(peer: Protocol) {
    const peerId = getPeerId(peer);
    const receive = new Event<SerializedObject>();
    this._peers.set(peerId, { peer, receive });

    const port = createPort(peer, receive);
    const cleanup = await this._onConnect(port, peerId);
    if (typeof cleanup === 'function') {
      const connection = this._peers.get(peerId);
      connection && (connection.cleanup = cleanup);
    }
  }

  private async _onPeerDisconnect(peer: Protocol) {
    const peerId = getPeerId(peer);
    const connection = this._peers.get(peerId);
    if (connection) {
      await connection.cleanup?.();
      this._peers.delete(peerId);
    }
  }

  private _onMessage(peer: Protocol, data: any) {
    const peerId = getPeerId(peer);
    const connection = this._peers.get(peerId);
    if (connection) {
      connection.receive.emit(data);
    }
  }
}

/**
 *
 */
export const createPort = (peer: Protocol, receive: Event<SerializedObject>): RpcPort => {
  return {
    send: async (msg) => {
      const extension = peer.getExtension(RpcPlugin.EXTENSION);
      assert(extension, 'Extension is not set.');
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

// TODO(burdon): What happens if undefined?
export const getPeerId = (peer: Protocol) => {
  const { peerId } = peer.getSession() ?? {};
  return peerId as string;
};

/**
 * Wrapper to ensure plugin only called once.
 */
// TODO(burdon): Debug why this is required with memory network.
type CreatePluginOptions = { maxConnections: number };
export const createRpcPlugin = (onOpen: OnConnect, options: CreatePluginOptions = { maxConnections: 1 }) => {
  let count = 0;
  return new RpcPlugin(async (port, peerId) => {
    if (count >= options.maxConnections) {
      // TODO(burdon): Propagate error to handler.
      log(`max connections reached: ${count}`);
      return;
    }

    count++;
    await onOpen(port, peerId);
  });
};
