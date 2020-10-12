//
// Copyright 2020 DXOS.org
//

import BJSON from 'buffer-json';

import { ItemID, MutationMeta } from '@dxos/echo-protocol';
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

export function createModelAdapter<T extends ClassicModel> (
  typeUrl: string,
  InnerModelConstructor: new () => T
): ModelConstructor<ModelAdapter<T>> {
  return class extends Model<Mutation> {
    static meta: ModelMeta = {
      type: `wrn://protocol.dxos.org/model/adapter/${encodeURIComponent(typeUrl)}`,
      mutation: schema.getCodecForType('dxos.echo.adapter.Mutation')
    }

    model = new InnerModelConstructor();

    constructor (meta: ModelMeta, itemId: ItemID, writeStream?: NodeJS.WritableStream) {
      super(meta, itemId, writeStream);

      if (this.model.setAppendHandler) {
        this.model.setAppendHandler(msg => {
          this._appendMessage(msg);
        });
      } else {
        (this.model as any).on('append', (msg: any) => {
          this._appendMessage(msg);
        });
      }
    }

    async _processMessage (meta: MutationMeta, message: Mutation): Promise<boolean> {
      const decoded = BJSON.parse(message.innerJson!);
      const messageToProcess = {
        ...decoded,
        __meta: {
          credentials: {
            member: meta.identityKey,
            feed: meta.feedKey,
            party: Buffer.from('00'.repeat(32), 'hex') // TODO(marik-d): Use actual party key here.
          }
        }
      };
      this.model.processMessages([messageToProcess]);
      return true;
    }

    private _appendMessage (msg: any) {
      const fullMessage = {
        __type_url: typeUrl,
        ...msg
      };
      this.write({
        innerJson: BJSON.stringify(fullMessage)
      });
    }
  };
}
