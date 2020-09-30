//
// Copyright 2020 DXOS.org
//

import { FeedMeta, ItemID } from '@dxos/echo-protocol';
import { Model, ModelConstructor, ModelMeta } from '@dxos/model-factory';

import { schema } from './proto/gen';
import { Mutation } from './proto/gen/dxos/echo/adapter';

export interface ClassicModel {

  id: string;

  destroyed: boolean;

  modelFactoryOptions: any;

  setAppendHandler (cb: (msg: any) => void): void;

  destroy (): Promise<void>;

  processMessages (messages: any[]): Promise<void>;

}

export interface ModelAdapter<T extends ClassicModel> extends Model<Mutation> {
  model: T
}

export function createModelAdapter<T extends ClassicModel> (typeUrl: string, InnerModelConstructor: new () => T): ModelConstructor<ModelAdapter<T>> {
  return class extends Model<Mutation> {
    static meta: ModelMeta = {
      type: `wrn://protocol.dxos.org/model/adapter/${encodeURIComponent(typeUrl)}`,
      mutation: schema.getCodecForType('dxos.echo.adapter.Mutation')
    }

    model = new InnerModelConstructor();

    constructor (meta: ModelMeta, itemId: ItemID, writeStream?: NodeJS.WritableStream) {
      super(meta, itemId, writeStream);

      this.model.setAppendHandler(msg => {
        this.write({
          innerJson: JSON.stringify(msg)
        });
      });
    }

    async _processMessage (meta: FeedMeta, message: Mutation): Promise<boolean> {
      const decoded = JSON.parse(message.innerJson!);
      this.model.processMessages([decoded]); // TODO(marik-d): Include `__meta`
      return true;
    }
  };
}
