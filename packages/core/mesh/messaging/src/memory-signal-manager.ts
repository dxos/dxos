//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { CommandTrace, SignalStatus } from './signal-client';
import { SignalManager } from './signal-manager';

/**
 * Common signaling context that connects multiple MemorySignalManager instances.
 */
export class MemorySignalManagerContext {
  // Swarm messages.
  readonly swarmEvent = new Event<{ topic: PublicKey, swarmEvent: SwarmEvent }>();

  // Mapping from topic to set of peers.
  readonly swarms = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  // Map of connections for each peer for signaling.
  readonly connections = new ComplexMap<PublicKey, MemorySignalManager>(PublicKey.hash);
}

/**
 * In memory signal manager for testing.
 */
export class MemorySignalManager implements SignalManager {
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

  constructor (
    private readonly _context: MemorySignalManagerContext
  ) {
    this._context.swarmEvent.on((data) => this.swarmEvent.emit(data));
  }

  getStatus (): SignalStatus[] {
    return [];
  }

  async join ({ topic, peerId }: { topic: PublicKey, peerId: PublicKey }) {
    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(PublicKey.hash));
    }

    this._context.swarms.get(topic)!.add(peerId);
    this._context.swarmEvent.emit({
      topic,
      swarmEvent: {
        peerAvailable: {
          peer: peerId.asUint8Array(),
          since: new Date()
        }
      }
    });

    // Emitting swarm events for each peer.
    for (const [topic, peerIds] of this._context.swarms) {
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
    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(PublicKey.hash));
    }

    this._context.swarms.get(topic)!.delete(peerId);

    const swarmEvent: SwarmEvent = {
      peerLeft: {
        peer: peerId.asUint8Array()
      }
    };

    this._context.swarmEvent.emit({ topic, swarmEvent });
  }

  async sendMessage ({ author, recipient, payload }: { author: PublicKey, recipient: PublicKey, payload: Any }) {
    assert(recipient);
    if (!this._context.connections.has(recipient)) {
      log.warn('Recipient is not subscribed for messages.', { author, recipient });
      return;
    }
    this._context.connections
      .get(recipient)!
      .onMessage.emit({ author, recipient, payload });
  }

  async subscribeMessages (peerId: PublicKey): Promise<void> {
    log(`Subscribing ${peerId} for messages`);
    this._context.connections.set(peerId, this);
  }

  async destroy () { }
}
