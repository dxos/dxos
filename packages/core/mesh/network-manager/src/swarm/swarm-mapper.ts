//
// Copyright 2020 DXOS.org
//

import { type CleanupFn, Event, SubscriptionList } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type PeerInfo as MessagingPeer, PeerInfoHash } from '@dxos/messaging';
import { ComplexMap } from '@dxos/util';

import { type ConnectionState } from './connection';
import { type Swarm } from './swarm';

/**
 * State of the connection to the remote peer with additional info derived from network mapping.
 */
export type PeerState = ConnectionState | 'INDIRECTLY_CONNECTED' | 'ME';

/**
 * Information about remote peer, directly or indirectly connected.
 */
export interface PeerInfo {
  id: PublicKey;
  state: PeerState;
  connections: PublicKey[];
}

export class SwarmMapper {
  private readonly _ctx = Context.default();
  private readonly _subscriptions = new SubscriptionList();
  private readonly _connectionSubscriptions = new ComplexMap<MessagingPeer, CleanupFn>(PeerInfoHash);
  private readonly _peers = new ComplexMap<MessagingPeer, PeerInfo>(PeerInfoHash);

  readonly mapUpdated = new Event<PeerInfo[]>();

  get peers(): PeerInfo[] {
    return Array.from(this._peers.values());
  }

  constructor(private readonly _swarm: Swarm) {
    this._subscriptions.add(
      _swarm.connectionAdded.on((connection) => {
        this._update(this._ctx);
        this._connectionSubscriptions.set(
          connection.remoteInfo,
          connection.stateChanged.on(() => {
            this._update(this._ctx);
          }),
        );
      }),
    );

    this._subscriptions.add(
      _swarm.disconnected.on((peerId) => {
        this._connectionSubscriptions.get(peerId)?.();
        this._connectionSubscriptions.delete(peerId);
        this._update(this._ctx);
      }),
    );

    // TODO(burdon): Do not call from constructor.
    this._update(this._ctx);
  }

  private _update(ctx: Context): void {
    log('updating swarm');

    this._peers.clear();
    this._peers.set(this._swarm.ownPeer, {
      id: this._swarm.ownPeerId,
      state: 'ME',
      connections: [],
    });

    for (const connection of this._swarm.connections) {
      this._peers.set(connection.remoteInfo, {
        id: PublicKey.from(connection.remoteInfo.peerKey),
        state: connection.state,
        connections: [this._swarm.ownPeerId],
      });
    }

    log('graph changed', {
      directConnections: this._swarm.connections.length,
      totalPeersInSwarm: this._peers.size,
    });

    this.mapUpdated.emit(Array.from(this._peers.values()));
  }

  // TODO(burdon): Async open/close.
  destroy(ctx: Context): void {
    Array.from(this._connectionSubscriptions.values()).forEach((cb) => cb());
    this._connectionSubscriptions.clear();
    this._subscriptions.clear();
  }
}
