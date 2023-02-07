//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';
import { MutationReceipt, SubscribeResponse } from '@dxos/protocols/proto/dxos/echo/service';

import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo-db:data-service-host');

/**
 * Provides methods for DataService for a single space.
 * A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on space id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceHost {
  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _itemDemuxer: ItemDemuxer,
    private readonly _writeStream?: FeedWriter<DataMessage>
  ) {}

  /**
   * Real-time subscription to data objects in a space.
   */
  subscribe(): Stream<SubscribeResponse> {
    return new Stream(({ next, ctx }) => {
      // send current state
      const objects = Array.from(this._itemManager.entities.values()).map((entity): EchoObject => {
        assert(entity instanceof Item);

        // TODO(dmaretskyi): Extract this to a method on Item.
        const { snapshot, mutations } = entity._stateManager.createSnapshot();

        return {
          objectId: entity.id,
          genesis: {
            itemType: entity.type,
            modelType: entity.modelType
          },
          snapshot: {
            ...snapshot,
            parentId: entity.parent?.id
          },
          mutations
        };
      });

      next({
        objects
      });

      // subscribe to mutations

      this._itemDemuxer.mutation.on(ctx, (mutation) => {
        log('Object update', { mutation });
        next({
          objects: [
            {
              ...mutation.data,
              mutations: mutation.data.mutations?.map((m) => ({
                ...m,
                meta: {
                  feedKey: PublicKey.from(mutation.meta.feedKey),
                  memberKey: PublicKey.from(mutation.meta.memberKey),
                  seq: mutation.meta.seq,
                  timeframe: mutation.meta.timeframe
                }
              }))
            }
          ]
        });
      });
    });
  }

  async write(object: EchoObject): Promise<MutationReceipt> {
    assert(this._writeStream, 'Cannot write mutations in readonly mode');

    return this._writeStream.write({
      object
    });
  }
}
