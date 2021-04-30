//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { Readable } from 'stream';

import { DatabaseSnapshot, EchoEnvelope, IEchoStream, ItemID, ItemSnapshot, ModelMutation, ModelSnapshot } from '@dxos/echo-protocol';
import { Model, ModelFactory, ModelMessage } from '@dxos/model-factory';
import { createReadable, createWritable, jsonReplacer, raise } from '@dxos/util';

import { DefaultModel } from './default-model';
import { Item } from './item';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo:item-demuxer');

export interface ItemManagerOptions {
  snapshots?: boolean
}

/**
 * Creates a stream that consumes `IEchoStream` messages and routes them to the associated items.
 * @param itemManager
 */
export class ItemDemuxer {
  /**
   * Records model mutations for snapshots.
   * This array is only there if model doesn't have its own snapshot implementation.
   */
  private readonly _modelMutations = new Map<ItemID, ModelMutation[]>();

  private readonly _itemStreams = new Map<ItemID, Readable>();

  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _options: ItemManagerOptions = {}
  ) {}

  open (): NodeJS.WritableStream {
    this._modelFactory.registered.on(async model => {
      for (const item of this._itemManager.getItemsWithDefaultModels()) {
        if (item.model.originalModelType === model.meta.type) {
          await this._itemManager.reconstructItemWithDefaultModel(item.id, this._itemStreams.get(item.id)!);
        }
      }
    });

    // TODO(burdon): Should this implement some "back-pressure" (hints) to the PartyProcessor?
    return createWritable<IEchoStream>(async (message: IEchoStream) => {
      log('Reading:', JSON.stringify(message, jsonReplacer));
      const { data: { itemId, genesis, itemMutation, mutation }, meta } = message;
      assert(itemId);

      //
      // New item.
      //
      if (genesis) {
        const { itemType, modelType } = genesis;
        assert(modelType);

        // Create inbound stream for item.
        const itemStream = createReadable<EchoEnvelope>();
        this._itemStreams.set(itemId, itemStream);

        // Create item.
        // TODO(marik-d): Investigate whether gensis message shoudl be able to set parentId.
        const item = await this._itemManager.constructItem({
          itemId,
          modelType: this._modelFactory.hasModel(modelType) ? modelType : DefaultModel.meta.type,
          itemType,
          readStream: itemStream,
          initialMutations: mutation ? [{ mutation, meta }] : undefined,
          link: genesis.link
        });
        if (item.model instanceof DefaultModel) {
          item.model.originalModelType = modelType;
        }
        assert(item.id === itemId);

        if (this._options.snapshots) {
          if (!item.modelMeta.snapshotCodec) {
            // If the model doesn't support mutations natively we save & replay it's mutations
            this._beginRecordingItemModelMutations(itemId);
          }

          // Record initial mutation (if it exists).
          if (mutation) {
            this._recordModelMutation(itemId, { meta: message.meta, mutation });
          }
        }
      }

      //
      // Set parent item references.
      //
      if (itemMutation) {
        const item = this._itemManager.getItem(itemId);
        assert(item);

        item._processMutation(itemMutation, itemId => this._itemManager.getItem(itemId));
      }

      //
      // Model mutations.
      //
      if (mutation && !genesis) {
        const itemStream = this._itemStreams.get(itemId);
        assert(itemStream, `Missing item: ${itemId}`);

        assert(message.data.mutation);
        if (this._options.snapshots) {
          this._recordModelMutation(itemId, { meta: message.meta, mutation: message.data.mutation });
        }

        // Forward mutations to the item's stream.
        await itemStream.push(message);
      }
    });
  }

  createSnapshot (): DatabaseSnapshot {
    assert(this._options.snapshots, 'Snapshots are disabled');
    return {
      items: this._itemManager.queryItems().value.map(item => this._createItemSnapshot(item))
    };
  }

  private _createItemSnapshot (item: Item<Model<any>>): ItemSnapshot {
    let model: ModelSnapshot;
    if (item.modelMeta.snapshotCodec) {
      model = {
        custom: item.modelMeta.snapshotCodec.encode(item.model.createSnapshot())
      };
    } else {
      model = {
        array: {
          mutations: this._modelMutations.get(item.id) ?? raise(new Error('Model does not support mutations natively and it\'s weren\'t tracked by the system.'))
        }
      };
    }

    return {
      itemId: item.id,
      itemType: item.type,
      modelType: item.modelMeta.type,
      parentId: item.parent?.id,
      model
    };
  }

  async restoreFromSnapshot (snapshot: DatabaseSnapshot) {
    const items = snapshot.items ?? [];
    log(`Restoring ${items.length} items from snapshot.`);

    for (const item of sortItemsTopologically(items)) {
      assert(item.itemId);
      assert(item.modelType);
      assert(item.model);

      assert(!this._itemStreams.has(item.itemId));
      const itemStream = createReadable<EchoEnvelope>();
      this._itemStreams.set(item.itemId, itemStream);

      if (this._options.snapshots && item.model?.array) {
        // TODO(marik-d): Check if model supports snapshots natively.
        this._modelMutations.set(item.itemId, item.model.array.mutations ?? []);
      }

      const newItem = await this._itemManager.constructItem({
        itemId: item.itemId,
        modelType: this._modelFactory.hasModel(item.modelType) ? item.modelType : DefaultModel.meta.type,
        itemType: item.itemType,
        readStream: itemStream,
        parentId: item.parentId,
        initialMutations: item.model.array ? item.model.array.mutations : undefined,
        modelSnapshot: item.model.custom ? item.model.custom : undefined
      });

      if (newItem.model instanceof DefaultModel) {
        newItem.model.originalModelType = item.modelType;
      }
    }
  }

  private _beginRecordingItemModelMutations (itemId: ItemID) {
    assert(!this._modelMutations.has(itemId), `Already recording model mutations for item ${itemId}`);
    this._modelMutations.set(itemId, []);
  }

  private _recordModelMutation (itemId: ItemID, mutation: ModelMessage<Uint8Array>) {
    const list = this._modelMutations.get(itemId);
    if (list) {
      list.push(mutation);
    }
  }
}

export function sortItemsTopologically (items: ItemSnapshot[]): ItemSnapshot[] {
  const snapshots: ItemSnapshot[] = [];
  const seenIds = new Set<ItemID>();

  while (snapshots.length !== items.length) {
    const prevLength = snapshots.length;
    for (const item of items) {
      assert(item.itemId);
      if (!seenIds.has(item.itemId) && (item.parentId == null || seenIds.has(item.parentId))) {
        snapshots.push(item);
        seenIds.add(item.itemId);
      }
    }
    if (prevLength === snapshots.length && snapshots.length !== items.length) {
      throw new Error('Cannot topologically sorts items in snapshot: some parents are missing.');
    }
  }

  return snapshots;
}
