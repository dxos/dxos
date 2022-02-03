//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import { failUndefined, raise } from '@dxos/debug';
import {
  DatabaseSnapshot, IEchoStream, ItemID, ItemSnapshot, ModelMutation, ModelSnapshot
} from '@dxos/echo-protocol';
import { createWritable } from '@dxos/feed-store';
import { Model, ModelFactory, ModelMessage } from '@dxos/model-factory';
import { jsonReplacer } from '@dxos/util';

import { DefaultModel } from './default-model';
import { Entity } from './entity';
import { Item } from './item';
import { ItemManager, ModelConstructionOptions } from './item-manager';

const log = debug('dxos:echo:item-demuxer');

export interface ItemDemuxerOptions {
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

  readonly mutation = new Event<IEchoStream>();

  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _options: ItemDemuxerOptions = {}
  ) {}

  open (): NodeJS.WritableStream {
    this._modelFactory.registered.on(async model => {
      for (const item of this._itemManager.getItemsWithDefaultModels()) {
        if (item.model.originalModelType === model.meta.type) {
          await this._itemManager.reconstructItemWithDefaultModel(item.id);
        }
      }
    });

    // TODO(burdon): Should this implement some "back-pressure" (hints) to the PartyProcessor?
    return createWritable<IEchoStream>(async (message: IEchoStream) => {
      log('Reading:', JSON.stringify(message, jsonReplacer));
      const { data: { itemId, genesis, itemMutation, mutation, snapshot }, meta } = message;
      assert(itemId);

      //
      // New item.
      //
      if (genesis) {
        const { itemType, modelType } = genesis;
        assert(modelType);

        const modelOpts: ModelConstructionOptions = {
          itemId,
          modelType: this._modelFactory.hasModel(modelType) ? modelType : DefaultModel.meta.type,
          initialMutations: mutation ? [{ mutation, meta }] : undefined
        };

        let entity: Entity<any>;
        if (genesis.link) {
          entity = await this._itemManager.constructLink({
            ...modelOpts,
            itemType,
            source: genesis.link.source ?? failUndefined(),
            target: genesis.link.target ?? failUndefined()
          });
        } else {
          entity = await this._itemManager.constructItem({
            ...modelOpts,
            itemType
          });
        }

        if (entity.model instanceof DefaultModel) {
          entity.model.originalModelType = modelType;
        }
        assert(entity.id === itemId);

        if (this._options.snapshots) {
          if (!entity.modelMeta.snapshotCodec) {
            // If the model doesn't support mutations natively we save & replay it's mutations.
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
        assert(message.data.mutation);
        const mutation = { meta: message.meta, mutation: message.data.mutation };

        if (this._options.snapshots) {
          this._recordModelMutation(itemId, mutation);
        }

        // Forward mutations to the item's stream.
        await this._itemManager.processModelMessage(itemId, mutation);
      }

      if (snapshot) {
        if (snapshot.custom) {
          const item = this._itemManager.getItem(itemId) as Item<Model<any>>;
          assert(item);
          assert(item.model.modelMeta.snapshotCodec);
          await item.model.restoreFromSnapshot(item.model.modelMeta.snapshotCodec.decode(snapshot.custom));
        } else if (snapshot.array) {
          for (const message of snapshot.array.mutations ?? []) {
            await this._itemManager.processModelMessage(itemId, message);
          }
        }
      }

      this.mutation.emit(message);
    });
  }

  createSnapshot (): DatabaseSnapshot {
    assert(this._options.snapshots, 'Snapshots are disabled');
    return {
      items: Array.from(this._itemManager.entities.values()).map(entity => this.createEntitySnapshot(entity))
    };
  }

  createEntitySnapshot (entity: Entity<Model<any>>): ItemSnapshot {
    let model: ModelSnapshot;
    if (entity.modelMeta.snapshotCodec) {
      model = {
        custom: entity.modelMeta.snapshotCodec.encode(entity.model.createSnapshot())
      };
    } else {
      model = {
        array: {
          mutations: this._modelMutations.get(entity.id) ??
            raise(new Error('Model does not support mutations natively and it\'s weren\'t tracked by the system.'))
        }
      };
    }

    return {
      itemId: entity.id,
      itemType: entity.type,
      modelType: entity.modelMeta.type,
      parentId: (entity instanceof Item) ? entity.parent?.id : undefined,
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

      if (this._options.snapshots && item.model?.array) {
        // TODO(marik-d): Check if model supports snapshots natively.
        this._modelMutations.set(item.itemId, item.model.array.mutations ?? []);
      }

      const newItem = await this._itemManager.constructItem({
        itemId: item.itemId,
        modelType: this._modelFactory.hasModel(item.modelType) ? item.modelType : DefaultModel.meta.type,
        itemType: item.itemType,
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
