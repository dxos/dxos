//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MutationMetaWithTimeframe } from '@dxos/protocols';
import { DataService, EchoEvent } from '@dxos/protocols/proto/dxos/echo/service';

import { Item } from './item';
import { ItemManager } from './item-manager';

// TODO(dmaretskyi): Subscription cleanup.

/**
 * Maintains subscriptions via DataService to create a local copy of the entities (items and links) in the database.
 *
 * Entities are updated using snapshots and mutations sourced from the DataService.
 * Item and model mutations are forwarded to the DataService.
 * This class is analogous to ItemDemuxer but for databases running in remote mode.
 */
export class DataMirror {
  private _entities?: Stream<EchoEvent>;

  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _dataService: DataService,
    private readonly _spaceKey: PublicKey
  ) {}

  async open() {
    const loaded = new Trigger();

    this._entities = this._dataService.subscribe({
      spaceKey: this._spaceKey
    });
    this._entities.subscribe(
      async (msg) => {
        for (const object of msg.batch.objects ?? []) {
          assert(object.objectId);

          let entity: Item<any> | undefined;
          if (object.genesis) {
            log('Construct', { object });
            assert(object.genesis.modelType);
            entity = await this._itemManager.constructItem({
              itemId: object.objectId,
              itemType: object.genesis.itemType,
              modelType: object.genesis.modelType,
              parentId: object.snapshot?.parentId,
              snapshot: { objectId: object.objectId } // TODO(dmaretskyi): Fix.
            });
          } else {
            entity = this._itemManager.entities.get(object.objectId);
          }
          if (!entity) {
            log.warn('Item not found', { objectId: object.objectId });
            return;
          }

          if (object.snapshot) {
            log('reset to snapshot', { object });
            entity._stateManager.resetToSnapshot(object);
          } else if (object.mutations) {
            for (const mutation of object.mutations) {
              log('mutate', { id: object.objectId, mutation });

              if (mutation.parentId || mutation.action) {
                entity._processMutation(mutation, (id) => this._itemManager.getItem(id));
              }

              if (mutation.model) {
                assert(mutation.meta);
                assert(mutation.meta.timeframe, 'Mutation timeframe is required.');
                await entity._stateManager.processMessage(mutation.meta as MutationMetaWithTimeframe, mutation.model);
              }
            }
          }
        }

        // Notify that initial set of items has been loaded.
        loaded.wake();
      },
      (err) => {
        log(`Connection closed: ${err}`);
      }
    );

    // Wait for initial set of items.
    await loaded.wait();
  }

  async close() {
    this._entities?.close();
  }
}
