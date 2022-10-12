//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { Model, ModelFactory, ModelMessage } from '@dxos/model-factory';
import { IEchoStream, ItemID } from '@dxos/protocols';
import { DatabaseSnapshot, ItemSnapshot, LinkSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { Entity } from './entity';
import { Item } from './item';
import { ItemManager, ModelConstructionOptions } from './item-manager';
import { Link } from './link';

const log = debug('dxos:echo-db:item-demuxer');

export interface ItemDemuxerOptions {
  snapshots?: boolean
}

export type EchoProcessor = (message: IEchoStream) => Promise<void>

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

  open (): EchoProcessor {
    this._modelFactory.registered.on(async model => {
      for (const item of this._itemManager.getUninitializedEntities()) {
        if (item._stateManager.modelType === model.meta.type) {
          await this._itemManager.initializeModel(item.id);
        }
      }
    });

    // TODO(burdon): Factor out.
    // TODO(burdon): Should this implement some "back-pressure" (hints) to the PartyProcessor?
    return async (message: IEchoStream) => {
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
          modelType,
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
            parentId: itemMutation?.parentId,
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

        item._processMutation(itemMutation, (itemId: ItemID) => this._itemManager.getItem(itemId));
      }

      //
      // Model mutations.
      //
      if (mutation && !genesis) {
        assert(message.data.mutation);
        const modelMessage: ModelMessage<Uint8Array> = { meta, mutation };

        // Forward mutations to the item's stream.
        await this._itemManager.processModelMessage(itemId, modelMessage);
      }

      if (snapshot) {
        const entity = this._itemManager.entities.get(itemId) ?? failUndefined();
        entity._stateManager.resetToSnapshot(snapshot);
      }

      this.mutation.emit(message);
    };
  }

  createSnapshot (): DatabaseSnapshot {
    assert(this._options.snapshots, 'Snapshots are disabled');
    return {
      items: this._itemManager.items.map(item => this.createItemSnapshot(item)),
      links: this._itemManager.links.map(link => this.createLinkSnapshot(link))
    };
  }

  createItemSnapshot (item: Item<Model<any>>): ItemSnapshot {
    const model = item._stateManager.createSnapshot();

    return {
      itemId: item.id,
      itemType: item.type,
      modelType: item.modelType,
      parentId: item.parent?.id,
      model
    };
  }

  createLinkSnapshot (link: Link<Model<any>>): LinkSnapshot {
    const model = link._stateManager.createSnapshot();

    return {
      linkId: link.id,
      linkType: link.type,
      modelType: link.modelMeta.type,
      source: link.source.id,
      target: link.target.id,
      model
    };
  }

  async restoreFromSnapshot (snapshot: DatabaseSnapshot) {
    const { items = [], links = [] } = snapshot;

    log(`Restoring ${items.length} items from snapshot.`);
    for (const item of sortItemsTopologically(items)) {
      assert(item.itemId);
      assert(item.modelType);
      assert(item.model);

      await this._itemManager.constructItem({
        itemId: item.itemId,
        modelType: item.modelType,
        itemType: item.itemType,
        parentId: item.parentId,
        snapshot: item.model
      });
    }

    log(`Restoring ${links.length} links from snapshot.`);
    for (const link of links) {
      assert(link.linkId);
      assert(link.modelType);
      assert(link.model);

      await this._itemManager.constructLink({
        itemId: link.linkId,
        itemType: link.linkType,
        modelType: link.modelType,
        source: link.source,
        target: link.target,
        snapshot: link.model
      });
    }
  }
}

/**
 * Sort based on parents.
 * @param items
 */
export const sortItemsTopologically = (items: ItemSnapshot[]): ItemSnapshot[] => {
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
};
