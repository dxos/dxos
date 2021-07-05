import { createId } from "@dxos/crypto";
import { Model, ModelConstructor } from "@dxos/model-factory";
import { FeedWriter, WriteReceipt } from '@dxos/echo-protocol';
import { ComplexMap } from "@dxos/util";
import { PublicKey } from "@dxos/crypto";

type ModelMessageOf<M extends Model<any>> = M extends Model<infer T> ? T : never;

export class TestRig<M extends Model<any>> {
  private readonly _peers = new ComplexMap<PublicKey, TestPeer<M>>(x => x.toHex())
  
  private _seq: number = 0;
  

  constructor(
    private readonly _modelConstructor: ModelConstructor<M>
  ) {} 
  
  createPeer(): TestPeer<M> {
    const key = PublicKey.random();

    const writer: FeedWriter<ModelMessageOf<M>> = {
      write: async (mutation) => {
        return this._writeMessage(key, mutation);
      }
    };

    const model = new this._modelConstructor(this._modelConstructor.meta, createId(), writer)

    const peer = new TestPeer(model)
    this._peers.set(key, peer)

    return peer;
  }

  private _writeMessage(peerKey: PublicKey, mutation: ModelMessageOf<M>): WriteReceipt {
    const meta = {
      feedKey: peerKey,
      memberKey: peerKey,
      seq: this._seq++
    };

    for(const peer of this._peers.values()) {
      // Process the message later, after resolving mutation-write promise. Doing otherwise breaks the model.
      setImmediate(() => peer.model.processor.write({ mutation, meta } as any));
    }

    return meta;
  }
}

export class TestPeer<M extends Model<any>> {
  constructor(
    public readonly model: M,
  ) {}
}
