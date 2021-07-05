//
// Copyright 2021 DXOS.org
//

import { createId, PublicKey } from '@dxos/crypto';
import { FeedWriter, Timeframe, WriteReceipt, MutationMeta } from '@dxos/echo-protocol';
import { Model, ModelConstructor } from '@dxos/model-factory';
import { ComplexMap } from '@dxos/util';
import debug from 'debug'

const log = debug('dxos:echo:model-test-rig')

type ModelMessageOf<M extends Model<any>> = M extends Model<infer T> ? T : never;

export class TestRig<M extends Model<any>> {
  private readonly _peers = new ComplexMap<PublicKey, TestPeer<M>>(x => x.toHex())

  constructor (
    private readonly _modelConstructor: ModelConstructor<M>
  ) {}

  createPeer (): TestPeer<M> {
    const key = PublicKey.random();

    const writer: FeedWriter<ModelMessageOf<M>> = {
      write: async (mutation) => {
        return this._writeMessage(key, mutation);
      }
    };

    const model = new this._modelConstructor(this._modelConstructor.meta, createId(), writer);

    const peer = new TestPeer(model, key);
    this._peers.set(key, peer);

    return peer;
  }

  private _writeMessage (peerKey: PublicKey, mutation: ModelMessageOf<M>): WriteReceipt {
    const seq = this._peers.get(peerKey)!.mutations.length;

    log(`Write ${peerKey}:${seq}`)
    this._peers.get(peerKey)!.mutations.push(mutation);
    
    // Process the message later, after resolving mutation-write promise. Doing otherwise breaks the model.
    setImmediate(() => this._replicate())

    return {
      feedKey: peerKey,
      seq
    };
  }

  private _replicate() {
    for (const peer of this._peers.values()) {
      for(const [feed, {mutations}] of this._peers) {
        const timeframeSeq = peer.timeframe.get(feed)
        const startingIndex = timeframeSeq === undefined ? 0 : timeframeSeq + 1
        log(`Replicating feed ${feed} -> ${peer.key} range [${startingIndex}; ${mutations.length})`)

        for(let i = startingIndex; i < mutations.length; i++) {
          const meta: MutationMeta = {
            feedKey: feed.asUint8Array(),
            memberKey: feed.asUint8Array(),
            seq: i,
          };
          log(`Process ${feed}:${i} -> ${peer.key}`)
          peer.processMutation(meta, mutations[i])
        }
      }
    }
  }
}

export class TestPeer<M extends Model<any>> {
  public timeframe = new Timeframe()

  public mutations: ModelMessageOf<M>[] = [];

  constructor (
    public readonly model: M,
    public readonly key: PublicKey
  ) {}

  processMutation (meta: MutationMeta, mutation: ModelMessageOf<M>) {
    this.model.processor.write({ mutation, meta } as any);

    this.timeframe = Timeframe.merge(this.timeframe, new Timeframe([[PublicKey.from(meta.feedKey), meta.seq]]));
  }
}
