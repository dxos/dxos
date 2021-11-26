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
        for (const ent of diff.added ?? []) {
          assert(ent.itemId);
          assert(ent.genesis);
          assert(ent.genesis.modelType);

          log(`Contstruct: ${JSON.stringify(ent)}`);

          let entity: Entity<Model<any>>;
          if (ent.genesis.link) {
            assert(ent.genesis.link.source);
            assert(ent.genesis.link.target);

            entity = await this._itemManager.constructLink({
              itemId: ent.itemId,
              itemType: ent.genesis.itemType,
              modelType: ent.genesis.modelType,
              source: ent.genesis.link.source,
              target: ent.genesis.link.target
            });
          } else {
            entity = await this._itemManager.constructItem({
              itemId: ent.itemId,
              itemType: ent.genesis.itemType,
              modelType: ent.genesis.modelType
            });
          }

          this._subscribeToUpdates(entity);
        }
      },
      err => {
        log(`DataMirror connection closed: ${err}`);
      }
    );
  }

  private _subscribeToUpdates (entity: Entity<Model<any>>) {
    const stream = this._dataService.SubscribeEntityStream({ partyKey: this._partkyKey, itemId: entity.id });
    stream.subscribe(
      async upd => {
        log(`Update ${entity.id}: ${JSON.stringify(upd)}`);
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
        log(`DataMirror connection closed: ${err}`);
      }
    );
  }
}
