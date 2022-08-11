//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { Answer, Message } from '../proto/gen/dxos/mesh/signal';
import { SignalApi } from './signal-api';
import { SignalManager } from './signal-manager';

export class InMemorySignalManager implements SignalManager {
  readonly statusChanged = new Event<SignalApi.Status[]>();
  readonly commandTrace = new Event<SignalApi.CommandTrace>();
  readonly peerCandidatesChanged = new Event<[topic: PublicKey, candidates: PublicKey[]]>();
  readonly onSignal = new Event<Message>();

  constructor (
    private readonly _onOffer: (message: Message) => Promise<Answer>
  ) {}

  getStatus (): SignalApi.Status[] {
    return [];
  }

  join (topic: PublicKey, peerId: PublicKey) {
    if (!state.swarms.has(topic)) {
      state.swarms.set(topic, new ComplexSet(x => x.toHex()));
    }

    state.swarms.get(topic)!.add(peerId);
    state.connections.set(peerId, this);

    setTimeout(() => this.peerCandidatesChanged.emit([topic, Array.from(state.swarms.get(topic)!.values())]), 0);
  }

  leave (topic: PublicKey, peerId: PublicKey) {
    if (!state.swarms.has(topic)) {
      state.swarms.set(topic, new ComplexSet(x => x.toHex()));
    }

    state.swarms.get(topic)!.delete(peerId);
  }

  lookup (topic: PublicKey) {
    setTimeout(() => this.peerCandidatesChanged.emit([topic, Array.from(state.swarms.get(topic)!.values())]), 0);
  }

  offer (msg: Message) {
    assert(msg.remoteId);
    assert(state.connections.has(msg.remoteId), 'Peer not connected');
    return state.connections.get(msg.remoteId)!._onOffer(msg);
  }

  async signal (msg: Message) {
    assert(msg.remoteId);
    assert(state.connections.get(msg.remoteId), 'Peer not connected');
    state.connections.get(msg.remoteId)!.onSignal.emit(msg);
  }

  async destroy () {}
}

// TODO(burdon): Remove global singleton.
// This is global state for the in-memory signal manager.
const state = {
  // Mapping from topic to set of peers.
  swarms: new ComplexMap<PublicKey, ComplexSet<PublicKey>>(x => x.toHex()),

  // Map of connections for each peer for signaling.
  connections: new ComplexMap<PublicKey, InMemorySignalManager>(x => x.toHex())
};
