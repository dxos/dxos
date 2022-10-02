//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { Model } from '@dxos/model-factory';
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
  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _dataService: DataService,
    private readonly _partyKey: PublicKey
  ) {}

  open () {
    const entities = this._dataService.subscribeEntitySet({ partyKey: this._partyKey });
    entities.subscribe(
      async diff => {
        for (const addedEntity of diff.added ?? []) {
          log(`Construct: ${JSON.stringify(addedEntity)}`);

          assert(addedEntity.itemId);
          assert(addedEntity.genesis);
          assert(addedEntity.genesis.modelType);

          let entity: Entity<Model<any>>;
          if (addedEntity.genesis.link) {
            assert(addedEntity.genesis.link.source);
            assert(addedEntity.genesis.link.target);

            entity = await this._itemManager.constructLink({
              itemId: addedEntity.itemId,
              itemType: addedEntity.genesis.itemType,
              modelType: addedEntity.genesis.modelType,
              source: addedEntity.genesis.link.source,
              target: addedEntity.genesis.link.target,
              snapshot: {}
            });
          } else {
            entity = await this._itemManager.constructItem({
              itemId: addedEntity.itemId,
              itemType: addedEntity.genesis.itemType,
              modelType: addedEntity.genesis.modelType,
              parentId: addedEntity.itemMutation?.parentId,
              snapshot: {}
            });
          }

          this._subscribeToUpdates(entity);
        }
      },
      err => {
        log(`Connection closed: ${err}`);
      }
    );
  }

  private _subscribeToUpdates (entity: Entity<Model<any>>) {
    const stream = this._dataService.subscribeEntityStream({ partyKey: this._partyKey, itemId: entity.id });
    stream.subscribe(
      async update => {
        log(`Update[${entity.id}]: ${JSON.stringify(update)}`);
        if (update.snapshot) {
          assert(update.snapshot.model);
          entity._stateManager.resetToSnapshot(update.snapshot.model);
        } else if (update.mutation) {
          if (update.mutation.data?.mutation) {
            assert(update.mutation.meta);
            await entity._stateManager.processMessage({
              feedKey: update.mutation.meta.feedKey ?? failUndefined(),
              memberKey: update.mutation.meta.memberKey ?? failUndefined(),
              seq: update.mutation.meta.seq ?? failUndefined(),
              timeframe: update.mutation.meta.timeframe ?? failUndefined()
            }, update.mutation.data.mutation ?? failUndefined());
          }
        }
      },
      err => {
        log(`Connection closed: ${err}`);
      }
    );
  }
}
