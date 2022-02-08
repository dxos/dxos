//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import {
  DatabaseSnapshot, IEchoStream, ItemID, ItemSnapshot
} from '@dxos/echo-protocol';
import { createWritable } from '@dxos/feed-store';
import { Model, ModelFactory } from '@dxos/model-factory';
import { jsonReplacer } from '@dxos/util';
import assert from 'assert';
import debug from 'debug';
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
  readonly mutation = new Event<IEchoStream>();

  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _options: ItemDemuxerOptions = {}
  ) {}

  open (): NodeJS.WritableStream {
    this._modelFactory.registered.on(async model => {
      for (const item of this._itemManager.getUninitializedEntities()) {
        if (item._stateManager.modelType === model.meta.type) {
          await this._itemManager.initializeModel(item.id);
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
          modelType: modelType,
          snapshot: {
            mutations: mutation ? [{ mutation, meta }] : undefined
          }
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

        assert(entity.id === itemId);
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

        // Forward mutations to the item's stream.
        await this._itemManager.processModelMessage(itemId, mutation);
      }

      if (snapshot) {
        const entity = this._itemManager.entities.get(itemId) ?? failUndefined();
        entity._stateManager.resetToSnapshot(snapshot);
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
    const model = entity._stateManager.createSnapshot();

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

      const newItem = await this._itemManager.constructItem({
        itemId: item.itemId,
        modelType: item.modelType,
        itemType: item.itemType,
        parentId: item.parentId,
        snapshot: item.model
      });
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
