//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory, MutationWriteReceipt } from '@dxos/model-factory';
import { EchoObject, EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { DataService, EchoEvent } from '@dxos/protocols/proto/dxos/echo/service';

import { tagMutationsInBatch } from './builder';
import { Item } from './item';
import { ItemManager } from './item-manager';
import { Batch } from './batch';

export type MutateResult = {
  objectsCreated: Item<any>[];
  batch: Batch;
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

  /**
   * Batches that are being committed or processed.
   * ClientTag -> Batch
   */
  private _pendingBatches = new Map<string, Batch>();

  private _currentBatch?: Batch;

  // prettier-ignore
  constructor(
    private readonly _service: DataService,
    private readonly _spaceKey: PublicKey
  ) { }

  get isReadOnly(): boolean {
    return false;
  }

  get currentBatch(): Batch | undefined {
    return this._currentBatch;
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

        this._processMessage(msg.batch);

        if (msg.clientTag) {
          const batch = this._pendingBatches.get(msg.clientTag);
          if (batch) {
            assert(msg.feedKey !== undefined)
            assert(msg.seq !== undefined)
            batch.receipt = {
              feedKey: msg.feedKey,
              seq: msg.seq
            };
            batch.receiptTrigger!.wake(batch.receipt)
            batch.processTrigger!.wake()
          } else {
            log('Missing pending batch', { clientTag: msg.clientTag });
          }
        }

        // Notify that initial set of items has been loaded.
        loaded.wake();
      },
      (err) => {
        if (err) {
          log.warn('Connection closed', err);
        }
      }
    );

    // Wait for initial set of items.
    await loaded.wait();
  }

  private _processMessage(batch: EchoObjectBatch, objectsCreated: Item<any>[] = []) {
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
          entity.processMessage(mutation);
        }
      }
    }
  }

  private _processOptimistic(objectMutation: EchoObject): Item<any> | undefined {
    assert(objectMutation.objectId);

    let entity: Item<any> | undefined;
    if (objectMutation.genesis && !this._itemManager.entities.has(objectMutation.objectId)) {
      log('Construct', { object: objectMutation });
      assert(objectMutation.genesis.modelType);
      entity = this._itemManager.constructItem({
        itemId: objectMutation.objectId,
        modelType: objectMutation.genesis.modelType
      });
    } else {
      entity = this._itemManager.entities.get(objectMutation.objectId);
    }
    if (!entity) {
      log.warn('Item not found', { objectId: objectMutation.objectId });
      return;
    }

    if (objectMutation.snapshot) {
      log('reset to snapshot', { object: objectMutation });
      entity.resetToSnapshot(objectMutation);
    } else if (objectMutation.mutations) {
      for (const mutation of objectMutation.mutations) {
        log('mutate', { id: objectMutation.objectId, mutation });
        entity.processOptimisticMutation(mutation);
      }
    }

    return entity;
  }

  /**
   * Begins a batch of mutations. If a batch is already in progress, this method does nothing.
   * Batches apply mutations to the database atomically. U
   * @returns true if a batch was started, false if there was already a batch in progress.
   */
  beginBatch(): boolean {
    if (this._currentBatch) {
      return false;
    }
    this._currentBatch = new Batch();
    this._currentBatch.clientTag = `${this._clientTagPrefix}:${this._clientTagCounter++}`;
    return true;
  }

  commitBatch() {
    const batch = this._currentBatch;
    assert(batch);
    this._currentBatch = undefined;

    assert(!batch.committing);
    assert(!batch.processTrigger);
    assert(batch.clientTag);
    assert(!this._pendingBatches.has(batch.clientTag));

    batch.processTrigger = new Trigger();
    batch.receiptTrigger = new Trigger();
    this._pendingBatches.set(batch.clientTag, batch);

    this._service.write({
      batch: batch.data,
      spaceKey: this._spaceKey,
      clientTag: batch.clientTag!,
    }).then(
      receipt => {
        log('commit', { clientTag: batch.clientTag, feedKey: receipt.feedKey, seq: receipt.seq });
        // No-op because the pipeline message will set the receipt.
      },
      err => {
        batch.receiptTrigger!.throw(err);
      }
    )
  }

  // TODO(dmaretskyi): Revert batch.

  mutate(batchInput: EchoObjectBatch): MutateResult {
    if (this._ctx.disposed) {
      throw new Error('Database is closed');
    }

    const batchCreated = this.beginBatch();
    try {
      this._currentBatch!.data.objects!.push(...(batchInput.objects ?? []));

      const objectsCreated: Item<any>[] = [];

      tagMutationsInBatch(batchInput, this._currentBatch!.clientTag!);
      log('mutate', { clientTag: this._currentBatch!.clientTag, objectCount: batchInput.objects?.length ?? 0 });

      // Optimistic apply.
      for (const objectMutation of batchInput.objects ?? []) {
        if (objectsCreated) {
          const item = this._processOptimistic(objectMutation);
          if (item) {
            objectsCreated.push(item);
          }
        }
      }

      const batch = this._currentBatch!;
      return {
        objectsCreated,
        batch,
      };
    } finally {
      if (batchCreated) {
        this.commitBatch();
      }
    }
  }

  async close(): Promise<void> {
    await this._ctx.dispose();

    // NOTE: Must be before entities stream is closed so that confirmations can come in.
    // TODO(dmaretskyi): Extract as db.flush()?.
    try {
      await Promise.all(
        Array.from(this._pendingBatches.values()).map((batch) => batch.processTrigger?.wait({ timeout: FLUSH_TIMEOUT }))
      );
    } catch (err) {
      log.error('timeout waiting for mutations to flush', {
        timeout: FLUSH_TIMEOUT,
        mutationTags: Array.from(this._pendingBatches.keys())
      });
    }

    await this._entities?.close();
  }
}
