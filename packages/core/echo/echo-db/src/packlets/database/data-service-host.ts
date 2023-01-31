//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { failUndefined, raise } from '@dxos/debug';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ItemID } from '@dxos/protocols';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';
import {
  MutationReceipt,
  SubscribeEntitySetResponse,
  SubscribeEntityStreamRequest,
  SubscribeEntityStreamResponse
} from '@dxos/protocols/proto/dxos/echo/service';

import { EntityNotFoundError } from '../errors';
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
   * Returns a stream with a list of active entities in the space.
   */
  subscribeEntitySet(): Stream<SubscribeEntitySetResponse> {
    return new Stream(({ next }) => {
      const trackedSet = new Set<ItemID>();

      const entityInfo = (id: ItemID): EchoObject => {
        const entity = this._itemManager.entities.get(id) ?? failUndefined();
        return {
          itemId: id,
          genesis: {
            itemType: entity.type,
            modelType: entity.modelType
          },
          itemMutation:
            entity instanceof Item
              ? {
                  parentId: entity.parent?.id
                }
              : undefined
        };
      };

      const update = () => {
        const added = new Set<ItemID>();
        const deleted = new Set<ItemID>();

        for (const entity of this._itemManager.entities.keys()) {
          if (!trackedSet.has(entity)) {
            added.add(entity);
            trackedSet.add(entity);
          }
        }

        for (const entity of trackedSet) {
          if (!this._itemManager.entities.has(entity)) {
            deleted.add(entity);
            trackedSet.delete(entity);
          }
        }

        next({
          added: Array.from(added).map((id) => entityInfo(id)),
          deleted: Array.from(added).map((id): EchoObject => ({ itemId: id }))
        });
      };

      update();
      return this._itemManager.debouncedUpdate.on(update);
    });
  }

  /**
   * Returns a stream of uppdates for a single entity.
   *
   * First message is a snapshot of the entity.
   * Subsequent messages are updates.
   */
  subscribeEntityStream(request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
    return new Stream(({ next }) => {
      assert(request.itemId);
      const entityItem = this._itemManager.items.find((item) => item.id === request.itemId);
      if (!entityItem) {
        raise(new EntityNotFoundError(request.itemId));
      }
      const snapshot = this._itemDemuxer.createItemSnapshot(entityItem as Item);

      log(`Entity stream ${request.itemId}: ${JSON.stringify({ snapshot })}`);
      next({ object: snapshot });

      return this._itemDemuxer.mutation.on((mutation) => {
        if (mutation.data.itemId !== request.itemId) {
          return;
        }

        log(`Entity stream ${request.itemId}: ${JSON.stringify({ mutation })}`);
        // assert(mutation.data.mutations?.length === 1, 'Only single mutation per item supported');
        next({
          object: {
            mutations: mutation.data.mutations?.map((m) => ({
              mutation: m.mutation,
              meta: {
                feedKey: PublicKey.from(mutation.meta.feedKey),
                memberKey: PublicKey.from(mutation.meta.memberKey),
                seq: mutation.meta.seq,
                timeframe: mutation.meta.timeframe
              }
            }))
          }
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
