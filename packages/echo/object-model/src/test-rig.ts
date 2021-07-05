import { createId } from "@dxos/crypto";
import { Model, ModelConstructor } from "@dxos/model-factory";
import { FeedWriter } from '@dxos/echo-protocol';
import { ComplexMap } from "@dxos/util";
import { PublicKey } from "@dxos/crypto";

type ModelMessageOf<M extends Model<any>> = M extends Model<infer T> ? T : never;

export class TestRig<M extends Model<any>> {
  private readonly _peers = new ComplexMap<PublicKey, TestPeer<M>>(x => x.toHex())
  

  constructor(
    private readonly _modelConstructor: ModelConstructor<M>
  ) {} 
  
  createPeer(): TestPeer<M> {
    const feedKey = PublicKey.random();
    const memberKey = PublicKey.random();
    let seq = 0;

    const writer: FeedWriter<ModelMessageOf<M>> = {
      write: async (mutation) => {
        const meta = {
          feedKey,
          memberKey,
          seq: seq++
        };
  
        // Process the message later, after resolving mutation-write promise. Doing otherwise breaks the model.
        setImmediate(() => model.processor.write({ mutation, meta } as any));
  
        return meta;
      }
    };

    const model = new this._modelConstructor(this._modelConstructor.meta, createId(), writer)

    return new TestPeer(model)
  }
}

export class TestPeer<M extends Model<any>> {
  constructor(
    public readonly model: M,
  ) {}
}
