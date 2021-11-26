import { PublicKey } from "@dxos/crypto";
import { DataService } from "@dxos/echo-protocol";
import { ItemManager } from "./item-manager";
import debug from 'debug'
import assert from "assert";
import { Entity } from "./entity";
import { Model } from "@dxos/model-factory";

const log = debug('dxos:echo:items:data-mirror');

// TODO(dmaretskyi): Subscription cleanup.

export class DataMirror {
  constructor(
    private readonly _itemManager: ItemManager,
    private readonly _dataService: DataService,
    private readonly _partkyKey: PublicKey,
  ) { }

  open() {
    const entities = this._dataService.SubscribeEntitySet({ partyKey: this._partkyKey });
    entities.subscribe(
      async diff => {
        for (const ent of diff.added ?? []) {
          assert(ent.itemId);
          assert(ent.genesis);
          assert(ent.genesis.modelType);

          log(`Contstruct: ${JSON.stringify(ent)}`)

          let entity: Entity<Model<any>>
          if (ent.genesis.link) {
            assert(ent.genesis.link.source);
            assert(ent.genesis.link.target);

            entity = await this._itemManager.constructLink({
              itemId: ent.itemId,
              itemType: ent.genesis.itemType,
              modelType: ent.genesis.modelType,
              source: ent.genesis.link.source,
              target: ent.genesis.link.target,
            })
          } else {
            entity = await this._itemManager.constructItem({
              itemId: ent.itemId,
              itemType: ent.genesis.itemType,
              modelType: ent.genesis.modelType,
            })
          }

          this._subscribeToUpdates(entity);
        }
      },
      err => {
        log(`DataMirror connection closed: ${err}`)
      }
    )
  }

  private _subscribeToUpdates(entity: Entity<Model<any>>) {
    const stream = this._dataService.SubscribeEntityStream({ partyKey: this._partkyKey, itemId: entity.id })
    stream.subscribe(
      async upd => {
        log(`Update ${entity.id}: ${JSON.stringify(upd)}`)
        if(upd.snapshot) {
          assert(upd.snapshot.model)
          if(upd.snapshot.model.custom) {
            assert(entity.modelMeta.snapshotCodec)
            await entity.model.restoreFromSnapshot(entity.modelMeta.snapshotCodec.decode(upd.snapshot.model?.custom))
          } else {
            assert(upd.snapshot.model.array)
            for(const msg of upd.snapshot.model.array.mutations ?? []) {
              await entity.model.processMessage(msg.meta, entity.modelMeta.mutation.decode(msg.mutation))
            }
          }
        } else if(upd.mutation) {
          if(upd.mutation.mutation) {
            await entity.model.processMessage({
              feedKey: PublicKey.random().asUint8Array(),
              memberKey: PublicKey.random().asUint8Array(),
              seq: 0,
            }, entity.modelMeta.mutation.decode(upd.mutation.mutation))
          }
        }
      },
      err => {
        log(`DataMirror connection closed: ${err}`)
      }
    )
  }
}