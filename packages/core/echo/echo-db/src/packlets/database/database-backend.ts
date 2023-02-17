//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory, MutationWriteReceipt } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { DataService, EchoEvent } from '@dxos/protocols/proto/dxos/echo/service';

import { tagMutationsInBatch } from './builder';
import { Item } from './item';
import { ItemManager } from './item-manager';

export type MutateResult = {
  objectsCreated: Item<any>[];
  getReceipt(): Promise<MutationWriteReceipt>;

  // TODO(dmaretskyi): .
};

const FLUSH_TIMEOUT = 5_000;
/**
 * Database backend that is backed by the DataService instance.
 * Uses DataMirror to populate entities in ItemManager.
 */
export class DatabaseBackendProxy {
  private _entities?: Stream<EchoEvent>;

  private readonly _ctx = new Context();
  public _itemManager!: ItemManager;
  private _clientTagPrefix = PublicKey.random().toHex().slice(0, 8);
  private _clientTagCounter = 0;

  private _mutationRoundTripTriggers = new Map<string, Trigger>();

  // prettier-ignore
  constructor(
    private readonly _service: DataService,
    private readonly _spaceKey: PublicKey
  ) { }

  get isReadOnly(): boolean {
    return false;
  }

  async open(itemManager: ItemManager, modelFactory: ModelFactory): Promise<void> {
    this._itemManager = itemManager;
    this._itemManager._debugLabel = 'proxy';

    modelFactory.registered.on(this._ctx, async (model) => {
      for (const item of this._itemManager.getUninitializedEntities()) {
        if (item.modelType === model.meta.type) {
          await this._itemManager.initializeModel(item.id);
        }
      }
    });

    const loaded = new Trigger();

    this._entities = this._service.subscribe({
      spaceKey: this._spaceKey
    });
    this._entities.subscribe(
      async (msg) => {
        log('process', {
          clientTag: msg.clientTag,
          feedKey: msg.feedKey,
          seq: msg.seq,
          objectCount: msg.batch.objects?.length ?? 0
        });

        // console.log(inspect(msg, false, null, true))
        this._process(msg.batch, false);

        if (msg.clientTag) {
          this._mutationRoundTripTriggers.get(msg.clientTag)?.wake();
          this._mutationRoundTripTriggers.delete(msg.clientTag);
        }

        // Notify that initial set of items has been loaded.
        loaded.wake();
      },
      (err) => {
        log(`Connection closed: ${err}`);
      }
    );

    // Wait for initial set of items.
    await loaded.wait();
  }

  // TODO(dmaretskyi): Remove optimistic flag.
  private _process(batch: EchoObjectBatch, optimistic: boolean, objectsCreated: Item<any>[] = []) {
    for (const object of batch.objects ?? []) {
      assert(object.objectId);

      let entity: Item<any> | undefined;
      if (object.genesis && !this._itemManager.entities.has(object.objectId)) {
        log('Construct', { object });
        assert(object.genesis.modelType);
        entity = this._itemManager.constructItem({
          itemId: object.objectId,
          modelType: object.genesis.modelType
        });
        objectsCreated.push(entity);
      } else {
        entity = this._itemManager.entities.get(object.objectId);
      }
      if (!entity) {
        log.warn('Item not found', { objectId: object.objectId });
        return;
      }

      if (object.snapshot) {
        log('reset to snapshot', { object });
        entity.resetToSnapshot(object);
      } else if (object.mutations) {
        for (const mutation of object.mutations) {
          log('mutate', { id: object.objectId, mutation });

          if (optimistic) {
            entity.processOptimisticMutation(mutation);
          } else {
            entity.processMessage(mutation);
          }
        }
      }
    }
  }

  mutate(batch: EchoObjectBatch): MutateResult {
    if (this._ctx.disposed) {
      throw new Error('Database is closed');
    }

    const objectsCreated: Item<any>[] = [];

    const clientTag = `${this._clientTagPrefix}:${this._clientTagCounter++}`;
    tagMutationsInBatch(batch, clientTag);
    this._mutationRoundTripTriggers.set(clientTag, new Trigger());
    log('mutate', { clientTag, objectCount: batch.objects?.length ?? 0 });

    // Optimistic apply.
    this._process(batch, true, objectsCreated);

    const writePromise = this._service.write({
      batch,
      spaceKey: this._spaceKey,
      clientTag
    });

    return {
      objectsCreated,
      getReceipt: async () => {
        const feedReceipt = await writePromise;

        return {
          ...feedReceipt,
          waitToBeProcessed: async () => {
            await this._mutationRoundTripTriggers.get(clientTag)?.wait();
          }
        };
      }
    };
  }

  async close(): Promise<void> {
    await this._ctx.dispose();

    // NOTE: Must be before entities stream is closed so that confirmations can come in.
    // TODO(dmaretskyi): Extract as db.flush()?.
    try {
      await Promise.all(
        Array.from(this._mutationRoundTripTriggers.values()).map((trigger) => trigger.wait({ timeout: FLUSH_TIMEOUT }))
      );
    } catch (err) {
      log.error('timeout waiting for mutations to flush', {
        timeout: FLUSH_TIMEOUT,
        mutationTags: Array.from(this._mutationRoundTripTriggers.keys())
      });
    }

    await this._entities?.close();
  }

  getWriteStream(): FeedWriter<DataMessage> | undefined {
    return {
      write: async (mutation) => {
        log('write', mutation);
        const { feedKey, seq } = await this._service.write({
          batch: {
            objects: [mutation.object]
          },
          spaceKey: this._spaceKey
        });
        assert(feedKey);
        assert(seq !== undefined);
        return {
          feedKey,
          seq
        };
      }
    };
  }
}
