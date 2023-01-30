//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { MutationMetaWithTimeframe } from '@dxos/protocols';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';

import { failUndefined } from '@dxos/debug';
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

    const entities = this._dataService.subscribe({
      spaceKey: this._spaceKey
    });
    entities.subscribe(
      async (msg) => {
        loaded.wake();
        for (const object of msg.objects ?? []) {
          assert(object.itemId);

          let entity: Entity<any>;
          if(object.genesis) {
            log('Construct', { object });
            assert(object.genesis.modelType);
            entity = await this._itemManager.constructItem({
              itemId: object.itemId,
              itemType: object.genesis.itemType,
              modelType: object.genesis.modelType,
              parentId: object.itemMutation?.parentId,
              snapshot: { itemId: object.itemId } // TODO(dmaretskyi): Fix.
            });
          } else {
            entity = await this._itemManager.entities.get(object.itemId) ?? failUndefined();
          }

          if (object.snapshot) {
            log('reset to snapshot', { object })
            entity._stateManager.resetToSnapshot(object);
          } else if (object.mutations) {
            for (const mutation of object.mutations) {
              log('mutate', { id: object.itemId, mutation })
              assert(mutation.meta);
              assert(mutation.meta.timeframe, 'Mutation timeframe is required.');
              await entity._stateManager.processMessage(mutation.meta as MutationMetaWithTimeframe, mutation.mutation);
            }
          }
        }
      },
      (err) => {
        log(`Connection closed: ${err}`);
      }
    );

    // Wait for initial set of items.
    await loaded.wait();
  }
}
