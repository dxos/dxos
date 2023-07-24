//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { tagMutationsInBatch, ItemDemuxer, ItemManager, setMetadataOnObject } from '@dxos/echo-db';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { invariant, log } from '@dxos/log';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { EchoEvent, MutationReceipt, WriteRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

/**
 * Provides methods for DataService for a single space.
 * A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on space id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceHost {
  private readonly _clientTagMap = new ComplexMap<[feedKey: PublicKey, seq: number], string>(
    ([feedKey, seq]) => `${feedKey.toHex()}:${seq}`,
  );

  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _itemDemuxer: ItemDemuxer,
    private readonly _writeStream?: FeedWriter<DataMessage>,
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
          objects,
        },
      });

      // subscribe to mutations

      this._itemDemuxer.mutation.on(ctx, (message) => {
        const { batch, meta } = message;
        invariant(!(meta as any).clientTag, 'Unexpected client tag in mutation message');
        log('message', { batch, meta });

        const clientTag = this._clientTagMap.get([message.meta.feedKey, message.meta.seq]);
        // TODO(dmaretskyi): Memory leak with _clientTagMap not getting cleared.

        // Assign feed metadata
        batch.objects?.forEach((object) => {
          setMetadataOnObject(object, { ...meta });
        });

        // Assign client tag metadata
        if (clientTag) {
          tagMutationsInBatch(batch, clientTag, 0);
        }

        next({
          clientTag,
          feedKey: message.meta.feedKey,
          seq: message.meta.seq,
          batch,
        });
      });
    });
  }

  async write(request: WriteRequest): Promise<MutationReceipt> {
    invariant(this._writeStream, 'Cannot write mutations in readonly mode');

    log('write', { clientTag: request.clientTag, objectCount: request.batch.objects?.length ?? 0 });

    // Clear client metadata.
    const message = createDataMessage(request.batch);

    const receipt = await this._writeStream.write(message, {
      afterWrite: async (receipt) => {
        // Runs before the mutation is read from the pipeline.
        if (request.clientTag) {
          log('tag', { clientTag: request.clientTag, feedKey: receipt.feedKey, seq: receipt.seq });
          this._clientTagMap.set([receipt.feedKey, receipt.seq], request.clientTag);
        }
      },
    });

    return receipt;
  }
}

const createDataMessage = (batch: EchoObjectBatch) => ({
  batch: {
    objects: batch.objects?.map((object) => ({
      ...object,
      mutations: object.mutations?.map((mutation) => ({
        ...mutation,
        meta: undefined,
      })),
      meta: undefined,
    })),
  },
});
