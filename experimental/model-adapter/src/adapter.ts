//
// Copyright 2020 DXOS.org
//

import { FeedMeta, ItemID } from '@dxos/experimental-echo-protocol';
import { Model, ModelConstructor, ModelMeta } from '@dxos/experimental-model-factory';

import { protocol } from './proto/';

export interface ClassicModel {

  id: string;

  destroyed: boolean;

  modelFactoryOptions: any;

  setAppendHandler (cb: (msg: any) => void): void;

  destroy (): Promise<void>;

  processMessages (messages: any[]): Promise<void>;

}

export interface ModelAdapter<T extends ClassicModel> extends Model<protocol.dxos.echo.adapter.IMutation> {
  model: T
}

export function createModelAdapter<T extends ClassicModel> (typeUrl: string, InnerModelConstructor: new () => T): ModelConstructor<ModelAdapter<T>> {
  return class extends Model<protocol.dxos.echo.adapter.IMutation> {
    static meta: ModelMeta = {
      type: `wrn://protocol.dxos.org/model/adapter/${encodeURIComponent(typeUrl)}`,
      mutation: 'dxos.echo.adapter.Mutation'
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

    async _processMessage (meta: FeedMeta, message: protocol.dxos.echo.adapter.IMutation): Promise<boolean> {
      const decoded = JSON.parse(message.innerJson!);
      this.model.processMessages([decoded]); // TODO(marik-d): Include `__meta`
      return true;
    }
  };
}
