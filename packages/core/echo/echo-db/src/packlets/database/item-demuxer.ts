//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { failUndefined } from '@dxos/debug';
import { Model, ModelFactory, ModelMessage } from '@dxos/model-factory';
import { IEchoStream, ItemID } from '@dxos/protocols';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';
import { EchoSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { Item } from './item';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo-db:item-demuxer');

export interface ItemDemuxerOptions {
  snapshots?: boolean;
}

export type EchoProcessor = (message: IEchoStream) => Promise<void>;

/**
 * Creates a stream that consumes `IEchoStream` messages and routes them to the associated items.
 * @param itemManager
 */
export class ItemDemuxer {
  readonly mutation = new Event<IEchoStream>();

  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _options: ItemDemuxerOptions = {}
  ) {}

  open(): EchoProcessor {
    this._modelFactory.registered.on(async (model) => {
      for (const item of this._itemManager.getUninitializedEntities()) {
        if (item._stateManager.modelType === model.meta.type) {
          await this._itemManager.initializeModel(item.id);
        }
      }
    });

    // TODO(burdon): Factor out.
    // TODO(burdon): Should this implement some "back-pressure" (hints) to the SpaceProcessor?
    return async (message: IEchoStream) => {
      const {
        data: { objectId, genesis, mutations, snapshot },
        meta
      } = message;
      const mutation = mutations?.length === 1 ? mutations?.[0] : undefined;
      assert(objectId);

      //
      // New item.
      //
      if (genesis) {
        const { itemType, modelType } = genesis;
        assert(modelType);

        const entity = await this._itemManager.constructItem({
          itemId: objectId,
          modelType,
          snapshot: {
            objectId,
            mutations:
              mutations?.map((mutation) => ({
                ...mutation,
                meta
              })) ?? []
          },
          itemType,
          parentId: mutation?.parentId
        });

        assert(entity.id === objectId);
      }

      //
      // Model mutations.
      //
      if (mutation) {
        if (mutation.parentId || mutation.action) {
          const item = this._itemManager.getItem(objectId);
          assert(item);

          item._processMutation(mutation, (objectId: ItemID) => this._itemManager.getItem(objectId));
        }

        if (mutation.model) {
          assert(message.data.mutations);
          const modelMessage: ModelMessage<Any> = { meta, mutation: mutation.model }; // TODO(mykola): Send google.protobuf.Any instead of Uint8Array.
          // Forward mutations to the item's stream.
          await this._itemManager.processModelMessage(objectId, modelMessage);
        }
      }

      if (snapshot?.model) {
        const entity = this._itemManager.entities.get(objectId) ?? failUndefined();
        entity._stateManager.resetToSnapshot(snapshot.model);
      }

      this.mutation.emit(message);
    };
  }

  createSnapshot(): EchoSnapshot {
    assert(this._options.snapshots, 'Snapshots are disabled');
    return {
      items: this._itemManager.items.map((item) => this.createItemSnapshot(item))
    };
  }

  createItemSnapshot(item: Item<Model<any>>): EchoObject {
    const { snapshot, ...model } = item._stateManager.createSnapshot();

    return {
      genesis: {
        itemType: item.type,
        modelType: item.modelType
      },
      snapshot: {
        parentId: item.parent?.id,
        ...snapshot
      },
      ...model
    };
  }

  async restoreFromSnapshot(snapshot: EchoSnapshot) {
    const { items = [] } = snapshot;

    log(`Restoring ${items.length} items from snapshot.`);
    for (const item of sortItemsTopologically(items)) {
      assert(item.objectId);
      assert(item.genesis?.modelType);
      assert(item.snapshot);

      await this._itemManager.constructItem({
        itemId: item.objectId,
        modelType: item.genesis.modelType,
        itemType: item.genesis.itemType,
        parentId: item.snapshot?.parentId,
        snapshot: item // TODO(mykola): Refactor to pass just EchoObject.
      });
    }
  }
}

/**
 * Sort based on parents.
 * @param items
 */
export const sortItemsTopologically = (items: EchoObject[]): EchoObject[] => {
  const snapshots: EchoObject[] = [];
  const seenIds = new Set<ItemID>();

  while (snapshots.length !== items.length) {
    const prevLength = snapshots.length;
    for (const item of items) {
      assert(item.objectId);
      if (!seenIds.has(item.objectId) && (!item.snapshot?.parentId || seenIds.has(item.snapshot.parentId))) {
        snapshots.push(item);
        seenIds.add(item.objectId);
      }
    }
    if (prevLength === snapshots.length && snapshots.length !== items.length) {
      throw new Error('Cannot topologically sorts items in snapshot: some parents are missing.');
    }
  }

  return snapshots;
};
