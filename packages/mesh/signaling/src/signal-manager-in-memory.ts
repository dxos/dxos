//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { SwarmEvent } from './proto';
import { Any } from './proto/gen/google/protobuf';
import { CommandTrace, SignalStatus } from './signal-client';
import { SignalManager } from './signal-manager';

export class SignalManagerInMemory implements SignalManager {
  readonly statusChanged = new Event<SignalStatus[]>();
  readonly commandTrace = new Event<CommandTrace>();
  readonly swarmEvent = new Event<{
    topic: PublicKey
    swarmEvent: SwarmEvent
  }>();

  readonly onMessage = new Event<{
    author: PublicKey
    recipient: PublicKey
    payload: Any
  }>();

  constructor () {
    state.swarmEvent.on((data) => this.swarmEvent.emit(data));
  }

  getStatus (): SignalStatus[] {
    return [];
  }

  async join ({ topic, peerId }: { topic: PublicKey, peerId: PublicKey }) {
    if (!state.swarms.has(topic)) {
      state.swarms.set(topic, new ComplexSet((x) => x.toHex()));
    }

    state.swarms.get(topic)!.add(peerId);
    state.connections.set(peerId, this);

    state.swarmEvent.emit({
      topic,
      swarmEvent: {
        peerAvailable: {
          peer: peerId.asUint8Array(),
          since: new Date()
        }
      }
    });

    // Emitting swarm events for each peer.
    for (const [topic, peerIds] of state.swarms) {
      Array.from(peerIds).forEach((peerId) => {
        this.swarmEvent.emit({
          topic,
          swarmEvent: {
            peerAvailable: {
              peer: peerId.asUint8Array(),
              since: new Date()
            }
          }
        });
      });
    }
  }

  async leave ({ topic, peerId }: { topic: PublicKey, peerId: PublicKey }) {
    if (!state.swarms.has(topic)) {
      state.swarms.set(topic, new ComplexSet((x) => x.toHex()));
    }

    state.swarms.get(topic)!.delete(peerId);

    const swarmEvent: SwarmEvent = {
      peerLeft: {
        peer: peerId.asUint8Array()
      }
    };

    state.swarmEvent.emit({ topic, swarmEvent });
  }

  async sendMessage ({ author, recipient, payload }: {author: PublicKey, recipient: PublicKey, payload: Any}) {
    assert(recipient);
    assert(state.connections.get(recipient), 'Peer not connected');
    state.connections
      .get(recipient)!
      .onMessage.emit({ author, recipient, payload });
  }

  async subscribeMessages (peerId: PublicKey): Promise<void> {}

  async destroy () {}
}

// TODO(burdon): Remove global singleton.
// This is global state for the in-memory signal manager.
const state = {
  swarmEvent: new Event<{ topic: PublicKey, swarmEvent: SwarmEvent }>(),
  // Mapping from topic to set of peers.
  swarms: new ComplexMap<PublicKey, ComplexSet<PublicKey>>((x) => x.toHex()),

  // Map of connections for each peer for signaling.
  connections: new ComplexMap<PublicKey, SignalManagerInMemory>((x) =>
    x.toHex()
  )
};
