//
// Copyright 2021 DXOS.org
//

import { createId, PublicKey } from '@dxos/crypto';
import { FeedWriter, Timeframe, WriteReceipt, MutationMeta } from '@dxos/echo-protocol';
import { Model, ModelConstructor } from '@dxos/model-factory';
import { ComplexMap } from '@dxos/util';

type ModelMessageOf<M extends Model<any>> = M extends Model<infer T> ? T : never;

export class TestRig<M extends Model<any>> {
  private readonly _peers = new ComplexMap<PublicKey, TestPeer<M>>(x => x.toHex())

  private _seq = 0;

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

    const peer = new TestPeer(model);
    this._peers.set(key, peer);

    return peer;
  }

  private _writeMessage (peerKey: PublicKey, mutation: ModelMessageOf<M>): WriteReceipt {
    const seq = this._seq++;

    const meta: MutationMeta = {
      feedKey: peerKey.asUint8Array(),
      memberKey: peerKey.asUint8Array(),
      seq
    };

    for (const peer of this._peers.values()) {
      // Process the message later, after resolving mutation-write promise. Doing otherwise breaks the model.
      setImmediate(() => peer.processMutation(meta, mutation));
    }

    return {
      feedKey: peerKey,
      seq
    };
  }
}

export class TestPeer<M extends Model<any>> {
  public timeframe = new Timeframe()

  constructor (
    public readonly model: M
  ) {}

  processMutation (meta: MutationMeta, mutation: ModelMessageOf<M>) {
    this.model.processor.write({ mutation, meta } as any);
  }
}
