//
// Copyright 2023 DXOS.org
//

import { scheduleTask, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { GossipExtension } from './gossip-extension';

export type GossipParams = {
  localPeerId: PublicKey;
};

/**
 * Gossip extensions manager.
 * Keeps track of all peers that are connected to the local peer.
 * Routes received announces to all connected peers.
 * Exposes API send announce to everybody and subscribe to .
 */
export class Gossip {
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  private readonly _listeners = new Map<string, Set<(message: GossipMessage) => void>>();

  private readonly _receivedMessages = new ComplexSet<PublicKey>(PublicKey.hash); // TODO(mykola): Memory leak. Never cleared.

  // remotePeerId -> PresenceExtension
  private readonly _connections = new ComplexMap<PublicKey, GossipExtension>(PublicKey.hash);

  public readonly connectionClosed = new Event<PublicKey>();

  constructor(private readonly _params: GossipParams) {}

  getConnections() {
    return Array.from(this._connections.keys());
  }

  createExtension({ remotePeerId }: { remotePeerId: PublicKey }): GossipExtension {
    const extension = new GossipExtension({
      onAnnounce: async (message) => {
        if (this._receivedMessages.has(message.messageId)) {
          return;
        }
        this._receivedMessages.add(message.messageId);
        this._callListeners(message);
        scheduleTask(this._ctx, async () => {
          await this._propagateAnnounce(message);
        });
      },
      onClose: async (err) => {
        if (err) {
          log.catch(err);
          log.trace('dxos.mesh.gossip.ConnectionClosedWithError', {
            ...JSON.parse(process.env.GRAVITY_AGENT_CONTEXT ?? ''),
            timestamp: Date.now(),
            err,
          });
        }
        if (this._connections.has(remotePeerId)) {
          this._connections.delete(remotePeerId);
        }
        this.connectionClosed.emit(remotePeerId);
      },
    });
    this._connections.set(remotePeerId, extension);

    return extension;
  }

  async destroy() {
    await this._ctx.dispose();
  }

  postMessage(channel: string, payload: any) {
    for (const extension of this._connections.values()) {
      void extension
        .sendAnnounce({
          peerId: this._params.localPeerId,
          messageId: PublicKey.random(),
          channelId: channel,
          timestamp: new Date(),
          payload,
        })
        .catch((err) => log(err));
    }
  }

  listen(channel: string, callback: (message: GossipMessage) => void) {
    if (!this._listeners.has(channel)) {
      this._listeners.set(channel, new Set());
    }
    this._listeners.get(channel)!.add(callback);

    return {
      unsubscribe: () => {
        this._listeners.get(channel)!.delete(callback);
      },
    };
  }

  private _callListeners(message: GossipMessage) {
    if (this._listeners.has(message.channelId)) {
      this._listeners.get(message.channelId)!.forEach((callback) => {
        callback(message);
      });
    }
  }

  private _propagateAnnounce(message: GossipMessage) {
    return Promise.all(
      [...this._connections.entries()].map(async ([remotePeerId, extension]) => {
        if (this._params.localPeerId.equals(message.peerId) || remotePeerId.equals(message.peerId)) {
          return;
        }
        return extension.sendAnnounce(message).catch((err) => log(err));
      }),
    );
  }
}
