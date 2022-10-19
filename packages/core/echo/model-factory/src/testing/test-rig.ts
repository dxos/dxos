//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Trigger } from '@dxos/async';
import type { FeedWriter, WriteReceipt } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap } from '@dxos/util';

import { Model } from '../model';
import { ModelFactory } from '../model-factory';
import { StateManager } from '../state-manager';
import { ModelConstructor, ModelMessage } from '../types';

const log = debug('dxos:echo:model-test-rig');

class MockFeedWriter<T> implements FeedWriter<T> {
  constructor (
    private readonly _writer: (data: T) => Promise<WriteReceipt>
  ) {}

  async write (data: T): Promise<WriteReceipt> {
    return this._writer(data);
  }
}

// TODO(burdon): Rewrite with TestBuilder pattern from feed-store.
// TODO(burdon): Rename and/or move to separate testing package.
export class TestRig<M extends Model<any>> {
  private readonly _peers = new ComplexMap<PublicKey, TestPeer<M>>(PublicKey.hash);

  private readonly _replicationFinished = new Trigger();

  private _replicating = true;

  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _modelConstructor: ModelConstructor<M>
  ) {
    this._replicationFinished.wake();
  }

  get replicating () {
    return this._replicating;
  }

  configureReplication (value: boolean) {
    this._replicating = value;
    this._replicate();
  }

  async waitForReplication () {
    log('Waiting for replication...');
    await this._replicationFinished.wait();
    log('Replications started.');
  }

  createPeer (): TestPeer<M> {
    const key = PublicKey.random();
    const writer = new MockFeedWriter<Uint8Array>((mutation: Uint8Array) => {
      return Promise.resolve(this._writeMessage(key, mutation));
    });

    const id = PublicKey.random().toHex();
    const stateManager = this._modelFactory.createModel<M>(this._modelConstructor.meta.type, id, {}, key, writer);

    const peer = new TestPeer(stateManager, key);
    this._peers.set(key, peer);
    return peer;
  }

  _writeMessage (peerKey: PublicKey, mutation: Uint8Array): WriteReceipt {
    const peer = this._peers.get(peerKey)!;
    const seq = peer.mutations.length;
    const timeframe = peer.timeframe;

    log(`Write ${peerKey}:${seq}`);
    const message: ModelMessage<Uint8Array> = {
      meta: {
        feedKey: peerKey,
        memberKey: peerKey,
        seq,
        timeframe
      },
      mutation
    };

    peer.mutations.push(message);

    // Process this mutation locally immediately.
    setTimeout(() => peer.processMutation(message));

    // Process the message later, after resolving mutation-write promise. Doing otherwise breaks the model.
    if (this._replicating) {
      setTimeout(() => this._replicate());
    }

    this._replicationFinished.reset();
    log('Reset replication lock.');

    return {
      feedKey: peerKey,
      seq
    };
  }

  private _replicate () {
    for (const peer of this._peers.values()) {
      for (const [feed, { mutations }] of this._peers) {
        if (peer.key.equals(feed)) {
          continue; // Do not replicate to self.
        }

        const timeframeSeq = peer.timeframe.get(feed);
        const startingIndex = timeframeSeq === undefined ? 0 : timeframeSeq + 1;
        log(`Replicating feed ${feed} -> ${peer.key} range [${startingIndex}; ${mutations.length})`);

        for (let i = startingIndex; i < mutations.length; i++) {
          log(`Process ${feed}:${i} -> ${peer.key}`);
          peer.processMutation(mutations[i]);
        }
      }
    }

    this._replicationFinished.wake();
    log('Wake replication lock.');
  }
}

export class TestPeer<M extends Model> {
  public timeframe = new Timeframe();

  public mutations: ModelMessage<Uint8Array>[] = [];

  constructor (
    public readonly stateManager: StateManager<M>,
    public readonly key: PublicKey
  ) {}

  get model (): M {
    return this.stateManager.model;
  }

  processMutation (message: ModelMessage<Uint8Array>) {
    this.stateManager.processMessage(message.meta, message.mutation);
    this.timeframe = Timeframe.merge(
      this.timeframe, new Timeframe([[PublicKey.from(message.meta.feedKey), message.meta.seq]]));
  }
}
