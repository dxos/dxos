import { createId } from "@dxos/crypto";
import { Model, ModelConstructor } from "@dxos/model-factory";
import { FeedWriter } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/crypto'

type ModelMessageOf<M extends Model<any>> = M extends Model<infer T> ? T : never;

export class TestRig<M extends Model<any>> {
  public readonly model: M;

  constructor(constructor: ModelConstructor<M>) {
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
        setImmediate(() => this.model.processor.write({ mutation, meta } as any));
  
        return meta;
      }
    };
  

    this.model = new constructor(constructor.meta, createId(), writer)
  }  
}
