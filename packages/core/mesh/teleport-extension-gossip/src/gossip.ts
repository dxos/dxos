//
// Copyright 2023 DXOS.org
//

import { Event, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, TimeoutError } from '@dxos/protocols';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { GossipExtension } from './gossip-extension';

export type GossipProps = {
  localPeerId: PublicKey;
};

const RECEIVED_MESSAGES_GC_INTERVAL = 120_000;

const MAX_CTX_TASKS = 50;

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

  private readonly _receivedMessages = new ComplexSet<PublicKey>(PublicKey.hash);

  /**
   * Keys scheduled to be cleared from _receivedMessages on the next iteration.
   */
  private readonly _toClear = new ComplexSet<PublicKey>(PublicKey.hash);

  // remotePeerId -> PresenceExtension
  private readonly _connections = new ComplexMap<PublicKey, GossipExtension>(PublicKey.hash);

  public readonly connectionClosed = new Event<PublicKey>();

  constructor(private readonly _params: GossipProps) {}

  get localPeerId() {
    return this._params.localPeerId;
  }

  async open(): Promise<void> {
    // Clear the map periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this._performGc();
      },
      RECEIVED_MESSAGES_GC_INTERVAL,
    );
  }

  async close(): Promise<void> {
    await this._ctx.dispose();
  }

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
        if (this._ctx.disposeCallbacksLength > MAX_CTX_TASKS) {
          log(`skipping propagating gossip message due to exessive tasks (${MAX_CTX_TASKS})`);
          return;
        }
        scheduleTask(this._ctx, async () => {
          await this._propagateAnnounce(message);
        });
      },
      onClose: async (err) => {
        if (this._connections.has(remotePeerId)) {
          this._connections.delete(remotePeerId);
        }
        this.connectionClosed.emit(remotePeerId);
      },
    });
    this._connections.set(remotePeerId, extension);

    return extension;
  }

  postMessage(channel: string, payload: any): void {
    for (const extension of this._connections.values()) {
      this._sendAnnounceWithTimeoutTracking(extension, {
        peerId: this._params.localPeerId,
        messageId: PublicKey.random(),
        channelId: channel,
        timestamp: new Date(),
        payload,
      }).catch(async (err) => {
        if (err instanceof RpcClosedError) {
          log('sendAnnounce failed because of RpcClosedError', { err });
        } else if (
          err instanceof TimeoutError ||
          err.constructor.name === 'TimeoutError' ||
          err.message.startsWith('Timeout')
        ) {
          log('sendAnnounce failed because of TimeoutError', { err });
        } else {
          log.catch(err);
        }
      });
    }
  }

  listen(channel: string, callback: (message: GossipMessage) => void): { unsubscribe: () => void } {
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

  private _callListeners(message: GossipMessage): void {
    if (this._listeners.has(message.channelId)) {
      this._listeners.get(message.channelId)!.forEach((callback) => {
        callback(message);
      });
    }
  }

  private _propagateAnnounce(message: GossipMessage): Promise<void[]> {
    return Promise.all(
      [...this._connections.entries()].map(async ([remotePeerId, extension]) => {
        if (this._params.localPeerId.equals(message.peerId) || remotePeerId.equals(message.peerId)) {
          return;
        }
        return this._sendAnnounceWithTimeoutTracking(extension, message).catch((err) => log(err));
      }),
    );
  }

  private _performGc(): void {
    const start = performance.now();

    for (const key of this._toClear.keys()) {
      this._receivedMessages.delete(key);
    }
    this._toClear.clear();
    for (const key of this._receivedMessages.keys()) {
      this._toClear.add(key);
    }

    const elapsed = performance.now() - start;
    if (elapsed > 100) {
      log.warn('GC took too long', { elapsed });
    }
  }

  private _sendAnnounceWithTimeoutTracking(extension: GossipExtension, message: GossipMessage): Promise<void> {
    return extension.sendAnnounce(message).catch((err) => {
      // Noop?
    });
  }
}
