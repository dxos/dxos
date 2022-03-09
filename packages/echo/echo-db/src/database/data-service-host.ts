//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, raise } from '@dxos/debug';
import {
  EchoEnvelope,
  FeedWriter,
  ItemID,
  MutationReceipt,
  SubscribeEntitySetResponse,
  SubscribeEntityStreamRequest,
  SubscribeEntityStreamResponse
} from '@dxos/echo-protocol';

import { Item, Link } from '../api';
import { EntityNotFoundError } from '../errors';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo-db:data-service-host');

/**
 * Provides methods for DataService for a single party.
 *
 * A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on party id.
 */
export class DataServiceHost {
  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _itemDemuxer: ItemDemuxer,
    private readonly _writeStream?: FeedWriter<EchoEnvelope>
  ) {}

  /**
   * Returns a stream with a list of active entities in the party.
   */
  subscribeEntitySet (): Stream<SubscribeEntitySetResponse> {
    return new Stream(({ next }) => {
      const trackedSet = new Set<ItemID>();

      const entityInfo = (id: ItemID): EchoEnvelope => {
        const entity = this._itemManager.entities.get(id) ?? failUndefined();
        return {
          itemId: id,
          genesis: {
            itemType: entity.type,
            modelType: entity.modelMeta.type,
            link: entity instanceof Link ? {
              source: entity.sourceId,
              target: entity.targetId
            } : undefined
          },
          itemMutation: entity instanceof Item ? {
            parentId: entity.parent?.id
          } : undefined
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
          added: Array.from(added).map(id => entityInfo(id)),
          deleted: Array.from(added).map((id): EchoEnvelope => ({ itemId: id }))
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
  subscribeEntityStream (request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
    return new Stream(({ next }) => {
      assert(request.itemId);
      const entity = this._itemManager.entities.get(request.itemId) ?? raise(new EntityNotFoundError(request.itemId));
      const snapshot = this._itemDemuxer.createEntitySnapshot(entity);

      log(`Entity stream ${request.itemId}: ${JSON.stringify({ snapshot })}`);
      next({ snapshot });

      return this._itemDemuxer.mutation.on(mutation => {
        if (mutation.data.itemId !== request.itemId) {
          return;
        }

        log(`Entity stream ${request.itemId}: ${JSON.stringify({ mutation })}`);
        next({
          mutation: {
            data: mutation.data,
            meta: {
              feedKey: PublicKey.from(mutation.meta.feedKey),
              memberKey: PublicKey.from(mutation.meta.memberKey),
              seq: mutation.meta.seq,
              timeframe: mutation.meta.timeframe
            }
          }
        });
      });
    });
  }

  async write (request: EchoEnvelope): Promise<MutationReceipt> {
    assert(this._writeStream, 'Cannot write mutations in readonly mode');

    return this._writeStream.write(request);
  }
}
