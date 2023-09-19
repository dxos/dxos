//
// Copyright 2021 DXOS.org
//

import { asyncTimeout, Event, scheduleTask, synchronized, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Model, ModelFactory } from '@dxos/model-factory';
import { ApiError } from '@dxos/protocols';
import { EchoObject, EchoObjectBatch } from '@dxos/protocols/proto/dxos/echo/object';
import { DataService, EchoEvent } from '@dxos/protocols/proto/dxos/echo/service';

import { Batch } from './batch';
import { tagMutationsInBatch } from './builder';
import { Item } from './item';
import { ItemManager } from './item-manager';

const FLUSH_TIMEOUT = 5_000;

export type MutateResult = {
  objectsUpdated: Item<any>[];
  batch: Batch;
};

export type BatchUpdate = {
  size?: number;
  duration?: number; // Set if batch is complete (or failed).
  error?: Error;
};

type DatabaseProxyParams = {
  service: DataService;
  itemManager: ItemManager;
  spaceKey: PublicKey;

  /**
   * Maximum number of mutations in a batch.
   * Note: It is used only in auto created batches, if user creates/commits batch outside it will be ignored.
   */
  maxBatchSize?: number;

  /**
   * Time of inactivity in milliseconds after which batch will be committed.
   */
  commitBatchInactivity?: number;
};

/**
 * Maintains a local cache of objects and provides a API for mutating the database.
 * Connects to a host instance via a DataService.
 */
export class DatabaseProxy {
  private _entities?: Stream<EchoEvent>;

  private readonly _ctx = new Context();
  private _currentBatchCtx?: Context;

  public readonly itemUpdate = new Event<Item<Model>[]>();
  public readonly pendingBatch = new Event<BatchUpdate>();

  private _initialEventTrigger = new Trigger();

  private _clientTagPrefix = PublicKey.random().toHex().slice(0, 8);
  private _clientTagCounter = 0;

  /**
   * Batches that are being committed or processed.
   * ClientTag -> Batch
   */
  private _pendingBatches = new Map<string, Batch>();
  private _currentBatch?: Batch;

  private _opening = false;
  private _open = false;

  private _subscriptionOpen = false;

  private readonly _service: DataService;
  public readonly _itemManager: ItemManager;
  private readonly _spaceKey: PublicKey;

  constructor(params: DatabaseProxyParams) {
    this._service = params.service;
    this._itemManager = params.itemManager;
    this._spaceKey = params.spaceKey;
  }

  get isReadOnly(): boolean {
    return false;
  }

  get isClosed(): boolean {
    return !this._subscriptionOpen;
  }

  get currentBatch(): Batch | undefined {
    return this._currentBatch;
  }

  @synchronized
  async open(modelFactory: ModelFactory): Promise<void> {
    this._opening = true;

    this._itemManager._debugLabel = 'proxy';

    // Close previous subscription.
    if (this._entities) {
      await this._entities.close();
      this._entities = undefined;
    }

    this._initialEventTrigger.reset();

    modelFactory.registered.on(this._ctx, async (model) => {
      for (const item of this._itemManager.getUninitializedEntities()) {
        if (item.modelType === model.meta.type) {
          this._itemManager.initializeModel(item.id);
        }
      }
    });

    invariant(!this._entities);
    this._entities = this._service.subscribe({
      spaceKey: this._spaceKey,
    });
    this._entities!.subscribe(this._processEvent.bind(this), (err) => {
      if (err) {
        log.warn('Connection closed', err);
      }

      this._subscriptionOpen = false;
      this._abortBatches();
    });
    this._subscriptionOpen = true;

    // Wait for initial set of items.
    await this._initialEventTrigger.wait();

    this._open = true;
  }

  async close(): Promise<void> {
    await this._ctx.dispose();

    // NOTE: Must be before entities stream is closed so that confirmations can come in.
    try {
      await this.flush({ timeout: FLUSH_TIMEOUT });
    } catch (err) {
      log.error('timeout waiting for mutations to flush', {
        timeout: FLUSH_TIMEOUT,
        mutationTags: Array.from(this._pendingBatches.keys()),
      });
    }

    await this._entities?.close();
    this._entities = undefined;
  }

  private _processEvent(msg: EchoEvent) {
    log('process', {
      clientTag: msg.clientTag,
      feedKey: msg.feedKey,
      seq: msg.seq,
      objectCount: msg.batch.objects?.length ?? 0,
    });

    const objectsUpdated: Item[] = [];

    if (msg.action === EchoEvent.DatabaseAction.RESET) {
      const keepIds = new Set<string>(
        msg.batch.objects?.filter((object) => object.genesis).map((object) => object.objectId) ?? [],
      );
      for (const item of this._itemManager.entities.values()) {
        if (!keepIds.has(item.id)) {
          this._itemManager.deconstructItem(item.id);
          objectsUpdated.push(item);
        }
      }
    }

    this._processMessage(msg.batch, objectsUpdated);

    if (msg.clientTag) {
      const batch = this._pendingBatches.get(msg.clientTag);
      if (batch) {
        invariant(msg.feedKey !== undefined);
        invariant(msg.seq !== undefined);
        batch.receipt = {
          feedKey: msg.feedKey,
          seq: msg.seq,
        };
        batch.receiptTrigger!.wake(batch.receipt);
        batch.processTrigger!.wake();
        this._pendingBatches.delete(msg.clientTag);

        // TODO(burdon): Not batched (e.g., if create item, then two batches).
        this.pendingBatch.emit({ size: this._pendingBatches.size, duration: Date.now() - batch.timestamp });
      } else {
        // TODO(dmaretskyi): Mutations created by other tabs will also have the tag.
        // TODO(dmaretskyi): Just ignore the I guess.
        // log.warn('missing pending batch', { clientTag: msg.clientTag });
      }
    }

    // Notify that initial set of items has been loaded.
    this._initialEventTrigger.wake();

    // Emit update event.
    this.itemUpdate.emit(objectsUpdated);
  }

  private _processMessage(batch: EchoObjectBatch, objectsUpdated: Item<any>[] = []) {
    for (const object of batch.objects ?? []) {
      invariant(object.objectId);

      let entity: Item<any> | undefined;
      if (object.genesis && !this._itemManager.entities.has(object.objectId)) {
        log('construct', { object });
        invariant(object.genesis.modelType);
        entity = this._itemManager.constructItem({
          itemId: object.objectId,
          modelType: object.genesis.modelType,
        });
      } else {
        entity = this._itemManager.entities.get(object.objectId);
      }
      if (!entity) {
        log.warn('Item not found', { objectId: object.objectId });
        return;
      }
      objectsUpdated.push(entity);

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
    invariant(objectMutation.objectId);

    let entity: Item<any> | undefined;
    if (objectMutation.genesis && !this._itemManager.entities.has(objectMutation.objectId)) {
      log('construct optimistic', { object: objectMutation });
      invariant(objectMutation.genesis.modelType);
      entity = this._itemManager.constructItem({
        itemId: objectMutation.objectId,
        modelType: objectMutation.genesis.modelType,
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
    if (!this._open) {
      throw new ApiError('Database not open');
    }

    if (this._currentBatch) {
      return false;
    }
    this._currentBatch = new Batch();
    this._currentBatch.clientTag = `${this._clientTagPrefix}:${this._clientTagCounter++}`;
    this.pendingBatch.emit({ size: this._pendingBatches.size + 1 });

    return true;
  }

  // TODO(burdon): Make async?
  commitBatch() {
    // Discard scheduled commit.
    void this._currentBatchCtx?.dispose();
    this._currentBatchCtx = undefined;

    invariant(this._subscriptionOpen);
    const batch = this._currentBatch;
    invariant(batch);
    this._currentBatch = undefined;

    invariant(!batch.committing);
    invariant(!batch.processTrigger);
    invariant(batch.clientTag);
    invariant(!this._pendingBatches.has(batch.clientTag));

    batch.processTrigger = new Trigger();
    batch.receiptTrigger = new Trigger();
    this._pendingBatches.set(batch.clientTag, batch);
    this.pendingBatch.emit({ size: this._pendingBatches.size });

    this._service
      .write({
        batch: this._itemManager.mergeMutations(batch.data),
        spaceKey: this._spaceKey,
        clientTag: batch.clientTag!,
      })
      .then(
        (receipt) => {
          log('commit', { clientTag: batch.clientTag, feedKey: receipt.feedKey, seq: receipt.seq });
          // No-op because the pipeline message will set the receipt.
        },
        (err) => {
          log.warn('batch commit err', { err });
          batch.receiptTrigger!.throw(err);
        },
      );
  }

  // TODO(dmaretskyi): Revert batch.

  mutate(batchInput: EchoObjectBatch): MutateResult {
    invariant(this._itemManager, 'Not open');
    if (this._ctx.disposed) {
      throw new Error('Database is closed');
    }

    const batchCreated = this.beginBatch();
    try {
      const startingMutationIndex = this._currentBatch!.data.objects!.length;
      this._currentBatch!.data.objects!.push(...(batchInput.objects ?? []));
      tagMutationsInBatch(batchInput, this._currentBatch!.clientTag!, startingMutationIndex);
      log('mutate', { clientTag: this._currentBatch!.clientTag, objectCount: batchInput.objects?.length ?? 0 });

      // Optimistic apply.
      const objectsUpdated: Item<any>[] = [];
      for (const objectMutation of batchInput.objects ?? []) {
        const item = this._processOptimistic(objectMutation);
        if (item) {
          objectsUpdated.push(item);
        }
      }
      this.itemUpdate.emit(objectsUpdated);

      const batch = this._currentBatch!;
      return {
        objectsUpdated,
        batch,
      };
    } finally {
      // Note: Commit batch after BATCH_COMMIT_AFTER idling without new mutations.
      if (batchCreated) {
        // Commit batch after last mutation with delay if there will be no new mutations.
        this._currentBatchCtx = this._ctx.derive();
        scheduleTask(this._currentBatchCtx, () => this.commitBatch(), BATCH_COMMIT_AFTER);
      } else if (this._currentBatchCtx) {
        // Reset the timer.
        // If `this._currentBatchCtx` is set then Batch was created by one of the previous calls of `.mutate()`.
        invariant(this._currentBatch);
        void this._currentBatchCtx.dispose();
        if (this._currentBatch.data.objects && this._currentBatch.data.objects.length >= BATCH_SIZE_LIMIT) {
          this.commitBatch();
        } else {
          this._currentBatchCtx = this._ctx.derive();
          scheduleTask(this._currentBatchCtx, () => this.commitBatch(), BATCH_COMMIT_AFTER);
        }
      }
    }
  }

  /**
   * Waits for any pending batches to complete.
   */
  async flush({ timeout }: { timeout?: number } = {}) {
    const promise = Promise.all(Array.from(this._pendingBatches.values()).map((batch) => batch.waitToBeProcessed()));
    if (timeout) {
      await asyncTimeout(promise, timeout);
    } else {
      await promise;
    }
    await this._service.flush({ spaceKey: this._spaceKey });
  }

  private _abortBatches() {
    for (const batch of this._pendingBatches.values()) {
      batch.processTrigger!.throw(new Error('Service connection closed.'));
    }
    this.pendingBatch.emit({
      size: this._pendingBatches.size,
      error: new Error('Service connection closed.'),
    });
    this._pendingBatches.clear();
  }
}
