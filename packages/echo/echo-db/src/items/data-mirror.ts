//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { DataService } from '@dxos/echo-protocol';
import { Model } from '@dxos/model-factory';

import { Entity } from './entity';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo:items:data-mirror');

// TODO(dmaretskyi): Subscription cleanup.

/**
 * Maintains subscribtions via DataService to create a local copy of the entities (items and links) in the database.
 *
 * Entities are updated using snapshots and mutations sourced from the DataService.
 * Entity and model mutations are forwarded to the DataService.
 * This class is analogous to ItemDemuxer but for databases running in remote mode.
 */
export class DataMirror {
  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _dataService: DataService,
    private readonly _partkyKey: PublicKey
  ) { }

  open () {
    const entities = this._dataService.SubscribeEntitySet({ partyKey: this._partkyKey });
    entities.subscribe(
      async diff => {
        for (const addedEntitiy of diff.added ?? []) {
          assert(addedEntitiy.itemId);
          assert(addedEntitiy.genesis);
          assert(addedEntitiy.genesis.modelType);

          log(`Contstruct: ${JSON.stringify(addedEntitiy)}`);

          let entity: Entity<Model<any>>;
          if (addedEntitiy.genesis.link) {
            assert(addedEntitiy.genesis.link.source);
            assert(addedEntitiy.genesis.link.target);

            entity = await this._itemManager.constructLink({
              itemId: addedEntitiy.itemId,
              itemType: addedEntitiy.genesis.itemType,
              modelType: addedEntitiy.genesis.modelType,
              source: addedEntitiy.genesis.link.source,
              target: addedEntitiy.genesis.link.target
            });
          } else {
            entity = await this._itemManager.constructItem({
              itemId: addedEntitiy.itemId,
              itemType: addedEntitiy.genesis.itemType,
              modelType: addedEntitiy.genesis.modelType,
              parentId: addedEntitiy.itemMutation?.parentId,
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
    const stream = this._dataService.SubscribeEntityStream({ partyKey: this._partkyKey, itemId: entity.id });
    stream.subscribe(
      async upd => {
        log(`Update[${entity.id}]: ${JSON.stringify(upd)}`);
        if (upd.snapshot) {
          assert(upd.snapshot.model);
          if (upd.snapshot.model.custom) {
            assert(entity.modelMeta.snapshotCodec);
            await entity.model.restoreFromSnapshot(entity.modelMeta.snapshotCodec.decode(upd.snapshot.model?.custom));
          } else {
            assert(upd.snapshot.model.array);
            for (const msg of upd.snapshot.model.array.mutations ?? []) {
              await entity.model.processMessage(msg.meta, entity.modelMeta.mutation.decode(msg.mutation));
            }
          }
        } else if (upd.mutation) {
          if (upd.mutation.data?.mutation) {
            assert(upd.mutation.meta);
            await entity.model.processMessage({
              feedKey: (upd.mutation.meta.feedKey ?? failUndefined()).asUint8Array(),
              memberKey: (upd.mutation.meta.memberKey ?? failUndefined()).asUint8Array(),
              seq: upd.mutation.meta.seq ?? failUndefined()
            }, entity.modelMeta.mutation.decode(upd.mutation.data.mutation ?? failUndefined()));
          }
        }
      },
      err => {
        log(`Connection closed: ${err}`);
      }
    );
  }
}
