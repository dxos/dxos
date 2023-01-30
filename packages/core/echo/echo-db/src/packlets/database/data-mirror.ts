//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Model } from '@dxos/model-factory';
import { MutationMetaWithTimeframe } from '@dxos/protocols';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';

import { Entity } from './entity';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo-db:data-mirror');

// TODO(dmaretskyi): Subscription cleanup.

/**
 * Maintains subscriptions via DataService to create a local copy of the entities (items and links) in the database.
 *
 * Entities are updated using snapshots and mutations sourced from the DataService.
 * Entity and model mutations are forwarded to the DataService.
 * This class is analogous to ItemDemuxer but for databases running in remote mode.
 */
export class DataMirror {
  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _dataService: DataService,
    private readonly _spaceKey: PublicKey
  ) {}

  async open() {
    const loaded = new Trigger();

    const entities = this._dataService.subscribeEntitySet({
      spaceKey: this._spaceKey
    });
    entities.subscribe(
      async (diff) => {
        loaded.wake();
        for (const addedEntity of diff.added ?? []) {
          log(`Construct: ${JSON.stringify(addedEntity)}`);
          assert(addedEntity.itemId);
          assert(addedEntity.genesis);
          assert(addedEntity.genesis.modelType);

          const entity = await this._itemManager.constructItem({
            itemId: addedEntity.itemId,
            itemType: addedEntity.genesis.itemType,
            modelType: addedEntity.genesis.modelType,
            parentId: addedEntity.itemMutation?.parentId,
            snapshot: { itemId: addedEntity.itemId }
          });

          this._subscribeToUpdates(entity);
        }
      },
      (err) => {
        log(`Connection closed: ${err}`);
      }
    );

    // Wait for initial set of items.
    await loaded.wait();
  }

  private _subscribeToUpdates(entity: Entity<Model<any>>) {
    const stream = this._dataService.subscribeEntityStream({
      spaceKey: this._spaceKey,
      itemId: entity.id
    });
    stream.subscribe(
      async (update) => {
        log(`Update[${entity.id}]: ${JSON.stringify(update)}`);
        if (update.object.snapshot) {
          entity._stateManager.resetToSnapshot(update.object);
        } else if (update.object.mutations) {
          assert(update.object.mutations.length === 1, 'We support only one mutation per message.');
          const mutation = update.object.mutations[0];
          assert(mutation.meta);
          assert(mutation.meta.timeframe, 'Mutation timeframe is required.');
          await entity._stateManager.processMessage(mutation.meta as MutationMetaWithTimeframe, mutation.mutation);
        }
      },
      (err) => {
        log(`Connection closed: ${err}`);
      }
    );
  }
}
