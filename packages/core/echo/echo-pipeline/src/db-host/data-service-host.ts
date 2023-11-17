//
// Copyright 2021 DXOS.org
//

import { UpdateScheduler } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { tagMutationsInBatch, type ItemDemuxer, type ItemManager, setMetadataOnObject } from '@dxos/echo-db';
import { type FeedWriter } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type EchoObject, type EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { DataService, EchoEvent, SyncRepoRequest, type MutationReceipt, type WriteRequest, SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

// After this limit the incremental object updates will be replaced with the full snapshot of the object.
const MUTATION_LIMIT_PER_OBJECT = 10;

export type DataServiceHostOptions = {
  /**
   * @default true
   */
  deferEvents?: boolean;
};

/**
 * Provides methods for DataService for a single space.
 * A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on space id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceHost {
  private readonly _ctx = new Context();

  private readonly _clientTagMap = new ComplexMap<[feedKey: PublicKey, seq: number], string>(
    ([feedKey, seq]) => `${feedKey.toHex()}:${seq}`,
  );

  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _itemDemuxer: ItemDemuxer,
    private readonly _flush: () => Promise<void>,
    private readonly _writeStream: FeedWriter<DataMessage> | undefined,
    private readonly _opts: DataServiceHostOptions = {},
  ) {}

  async open() {}

  async close() {
    await this._ctx.dispose();
  }

  private get _deferEvents(): boolean {
    return this._opts.deferEvents ?? true;
  }

  /**
   * Real-time subscription to data objects in a space.
   */
  subscribe(): Stream<EchoEvent> {
    return new Stream(({ next, close, ctx }) => {
      // This looks ridiculous..
      ctx.onDispose(this._ctx.onDispose(close));

      // send current state
      const objects = Array.from(this._itemManager.entities.values()).map((entity) => entity.createSnapshot());
      next({
        batch: {
          objects,
        },
      });

      const updateScheduler = new UpdateScheduler(
        ctx,
        async () => {
          flushPendingUpdate();
        },
        {
          maxFrequency: 10,
        },
      );

      const pendingUpdates: EchoObject[] = [];
      const mutationsPerObject = new Map<string, number>();

      const clearPendingUpdates = () => {
        pendingUpdates.length = 0;
        mutationsPerObject.clear();
      };

      const flushPendingUpdate = () => {
        const stagedEvents: EchoObject[] = [];
        const objectsWithSnapshots = new Set<string>();
        for (const [id, count] of mutationsPerObject) {
          if (count >= MUTATION_LIMIT_PER_OBJECT) {
            objectsWithSnapshots.add(id);
            const entity = this._itemManager.entities.get(id);
            if (entity) {
              stagedEvents.push(entity.createSnapshot());
            }
          }
        }

        for (const obj of pendingUpdates) {
          if (!objectsWithSnapshots.has(obj.objectId)) {
            stagedEvents.push(obj);
          }
        }

        next({
          batch: {
            objects: stagedEvents,
          },
        });
        clearPendingUpdates();
      };

      // Subscribe to clear events on Epoch processing.
      this._itemDemuxer.snapshot.on(ctx, (snapshot) => {
        clearPendingUpdates();
        next({
          action: EchoEvent.DatabaseAction.RESET,
          batch: { objects: snapshot.items },
        });
      });

      // Subscribe to mutations.
      this._itemDemuxer.mutation.on(ctx, (message) => {
        const { batch, meta } = message;
        invariant(!(meta as any).clientTag, 'Unexpected client tag in mutation message');
        log('message', { batch: batch.objects?.length, meta });

        const clientTag = this._clientTagMap.get([message.meta.feedKey, message.meta.seq]);
        // TODO(dmaretskyi): Memory leak with _clientTagMap not getting cleared.

        // Assign feed metadata
        batch.objects?.forEach((object) => {
          setMetadataOnObject(object, { ...meta });
        });

        // Assign client tag metadata
        if (clientTag) {
          flushPendingUpdate();

          tagMutationsInBatch(batch, clientTag, 0);

          next({
            clientTag,
            feedKey: message.meta.feedKey,
            seq: message.meta.seq,
            batch,
          });
        } else {
          for (const obj of batch.objects ?? []) {
            const newCount = (mutationsPerObject.get(obj.objectId) ?? 0) + 1;
            mutationsPerObject.set(obj.objectId, newCount);
          }

          for (const obj of batch.objects ?? []) {
            if ((mutationsPerObject.get(obj.objectId) ?? 0) < MUTATION_LIMIT_PER_OBJECT) {
              pendingUpdates.push(obj);
            }
          }

          if (this._deferEvents) {
            updateScheduler.trigger();
          } else {
            flushPendingUpdate();
          }
        }
      });
    });
  }

  async write(request: WriteRequest): Promise<MutationReceipt> {
    invariant(!this._ctx.disposed, 'Cannot write to closed DataServiceHost');
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

  async flush(): Promise<void> {
    await this._flush();
  }

  syncRepo(request: SyncRepoRequest): Stream<SyncRepoResponse> {
    throw new Error('Method not implemented.');
  }
  sendSyncMessage(request: SyncRepoRequest): Promise<void> {
    throw new Error('Method not implemented.');
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
