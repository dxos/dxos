//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { SwarmEvent } from '../proto/gen/dxos/mesh/signal';
import { Answer, NetworkMessage } from '../proto/gen/dxos/mesh/networkMessage';
import { SignalApi } from './signal-api';
import { SignalManager } from './signal-manager';

export class InMemorySignalManager implements SignalManager {
  readonly statusChanged = new Event<SignalApi.Status[]>();
  readonly commandTrace = new Event<SignalApi.CommandTrace>();
  readonly swarmEvent = new Event<[topic: PublicKey, swarmEvent: SwarmEvent]>();
  readonly onMessage = new Event<NetworkMessage>();

  constructor (
    private readonly _onOffer: (message: NetworkMessage) => Promise<Answer>
  ) {
    state.swarmEvent.on(data => this.swarmEvent.emit(data));
  }

  getStatus (): SignalApi.Status[] {
    return [];
  }

  join (topic: PublicKey, peerId: PublicKey) {
    if (!state.swarms.has(topic)) {
      state.swarms.set(topic, new ComplexSet(x => x.toHex()));
    }

    state.swarms.get(topic)!.add(peerId);
    state.connections.set(peerId, this);

    state.swarmEvent.emit([topic, {
      peerAvailable: {
        peer: peerId.asUint8Array(),
        since: new Date()
      }
    }]);

    // Emitting swarm events for each peer.
    for (const [topic, peerIds] of state.swarms) {
      Array.from(peerIds).forEach(peerId => {
        this.swarmEvent.emit([topic, {
          peerAvailable: {
            peer: peerId.asUint8Array(),
            since: new Date()
          }
        }]);
      });
    }
  }

  leave (topic: PublicKey, peerId: PublicKey) {
    if (!state.swarms.has(topic)) {
      state.swarms.set(topic, new ComplexSet(x => x.toHex()));
    }

    state.swarms.get(topic)!.delete(peerId);

    const swarmEvent: SwarmEvent = {
      peerLeft: {
        peer: peerId.asUint8Array()
      }
    };

    state.swarmEvent.emit([topic, swarmEvent]);
  }

  offer (msg: NetworkMessage) {
    assert(msg.remoteId);
    assert(state.connections.has(msg.remoteId), 'Peer not connected');
    return state.connections.get(msg.remoteId)!._onOffer(msg);
  }

  async message (msg: NetworkMessage) {
    assert(msg.remoteId);
    assert(state.connections.get(msg.remoteId), 'Peer not connected');
    state.connections.get(msg.remoteId)!.onMessage.emit(msg);
  }

  async destroy () {}
}

// TODO(burdon): Remove global singleton.
// This is global state for the in-memory signal manager.
const state = {
  swarmEvent: new Event<[topic: PublicKey, swarmEvent: SwarmEvent]>(),
  // Mapping from topic to set of peers.
  swarms: new ComplexMap<PublicKey, ComplexSet<PublicKey>>(x => x.toHex()),

  // Map of connections for each peer for signaling.
  connections: new ComplexMap<PublicKey, InMemorySignalManager>(x => x.toHex())
};
