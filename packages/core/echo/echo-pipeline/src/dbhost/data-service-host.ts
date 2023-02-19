//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { tagMutationsInBatch, ItemDemuxer, ItemManager } from '@dxos/echo-db';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoEvent, MutationReceipt, WriteRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

/**
 * Provides methods for DataService for a single space.
 * A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on space id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceHost {
  private readonly _clientTagMap = new ComplexMap<[feedKey: PublicKey, seq: number], string>(
    ([feedKey, seq]) => `${feedKey.toHex()}:${seq}`
  );

  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _itemDemuxer: ItemDemuxer,
    private readonly _writeStream?: FeedWriter<DataMessage>
  ) {}

  /**
   * Real-time subscription to data objects in a space.
   */
  subscribe(): Stream<EchoEvent> {
    return new Stream(({ next, ctx }) => {
      // send current state
      const objects = Array.from(this._itemManager.entities.values()).map((entity) => entity.createSnapshot());

      next({
        batch: {
          objects
        }
      });

      // subscribe to mutations

      this._itemDemuxer.mutation.on(ctx, (mutation) => {
        log('Object update', { mutation });

        const clientTag = this._clientTagMap.get([mutation.meta.feedKey, mutation.meta.seq]);
        // TODO(dmaretskyi): Memorąąy leak with _clientTagMap not getting cleared.

        // Assign feed metadata
        const batch = {
          objects: [
            {
              ...mutation.data,
              mutations: mutation.data.mutations?.map((m, mutationIdx) => ({
                ...m,
                meta: mutation.meta
              })),
              meta: mutation.meta
            }
          ]
        };

        // Assign client tag metadata
        if (clientTag) {
          tagMutationsInBatch(batch, clientTag);
        }

        next({
          clientTag,
          feedKey: mutation.meta.feedKey,
          seq: mutation.meta.seq,
          batch
        });
      });
    });
  }

  async write(request: WriteRequest): Promise<MutationReceipt> {
    assert(this._writeStream, 'Cannot write mutations in readonly mode');
    assert(request.batch.objects?.length === 1, 'Only single object mutations are supported');

    const receipt = await this._writeStream.write({
      object: {
        ...request.batch.objects[0],
        mutations: request.batch.objects[0].mutations?.map((m) => ({
          ...m,
          meta: undefined
        })),
        meta: undefined
      }
    });
    if (request.clientTag) {
      this._clientTagMap.set([receipt.feedKey, receipt.seq], request.clientTag);
    }

    return receipt;
  }
}
