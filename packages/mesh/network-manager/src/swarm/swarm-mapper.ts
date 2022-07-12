//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

import { ConnectionState } from './connection';
import { Swarm } from './swarm';

/**
 * State of the connection to the remote peer with additional info derived from network mapping.
 */
export type PeerState = ConnectionState | 'INDIRECTLY_CONNECTED' | 'ME'

/**
 * Information about remote peer, directly or indirectly connected.
 */
export interface PeerInfo {
  id: PublicKey
  state: PeerState,
  connections: PublicKey[]
}

type Unsubscribe = () => void;

const log = debug('dxos:network-manager:swarm-mapper');

export class SwarmMapper {
  private readonly _subscriptions = new SubscriptionGroup();

  private readonly _connectionSubscriptions = new ComplexMap<PublicKey, Unsubscribe>(x => x.toHex());

  private readonly _peers = new ComplexMap<PublicKey, PeerInfo>(x => x.toHex());

  get peers (): PeerInfo[] {
    return Array.from(this._peers.values());
  }

  readonly mapUpdated = new Event<PeerInfo[]>();

  constructor (
    private readonly _swarm: Swarm,
    private readonly _presence: PresencePlugin | undefined
  ) {
    this._subscriptions.push(_swarm.connectionAdded.on(connection => {
      this._update();
      this._connectionSubscriptions.set(connection.remoteId, connection.stateChanged.on(() => {
        this._update();
      }));
    }));
    this._subscriptions.push(_swarm.connectionRemoved.on(connection => {
      this._connectionSubscriptions.get(connection.remoteId)?.();
      this._connectionSubscriptions.delete(connection.remoteId);
      this._update();
    }));
    if (_presence) {
      const cb = () => {
        this._update();
      };
      this._subscriptions.push(_presence.graphUpdated.on(cb));
    }
    this._update();
  }

  private _update () {
    this._peers.clear();
    this._peers.set(this._swarm.ownPeerId, {
      id: this._swarm.ownPeerId,
      state: 'ME',
      connections: []
    });
    for (const connection of this._swarm.connections) {
      this._peers.set(connection.remoteId, {
        id: connection.remoteId,
        state: connection.state,
        connections: [this._swarm.ownPeerId]
      });
    }
    if (this._presence) {
      this._presence.graph.forEachNode((node: any) => {
        const id = PublicKey.fromHex(node.id);
        if (this._peers.has(id)) {
          return;
        }
        this._peers.set(id, {
          id,
          state: 'INDIRECTLY_CONNECTED',
          connections: []
        });
      });
      this._presence.graph.forEachLink((link: any) => {
        const from = PublicKey.from(link.fromId);
        const to = PublicKey.from(link.toId);
        // Ignore connections to self, they are already handled.
        if (!from.equals(this._swarm.ownPeerId) && !to.equals(this._swarm.ownPeerId)) {
          this._peers.get(from)!.connections.push(to);
        }
      });
    }
    log(`Graph changed directConnections=${this._swarm.connections.length} totalPeersInSwarm=${this._peers.size}`);
    this.mapUpdated.emit(Array.from(this._peers.values()));
  }

  destroy () {
    Array.from(this._connectionSubscriptions.values()).forEach(cb => cb());
    this._subscriptions.unsubscribe();
  }
}
