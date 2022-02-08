//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { Model, ModelMeta } from '@dxos/model-factory';
import { StateManager } from '@dxos/model-factory/src/state-manager';
import { SubscriptionGroup } from '@dxos/util';

import { ItemManager } from './item-manager';

/**
 * Base class for all ECHO entitities.
 *
 * Subclassed by Item and Link.
 */
export class Entity<M extends Model> {
  // Called whenever item processes mutation.
  protected readonly _onUpdate = new Event<Entity<any>>();

  private readonly _subscriptions = new SubscriptionGroup();

  /**
   * @internal
   */
  public _stateManager!: StateManager<M>

  constructor (
    protected readonly _itemManager: ItemManager,
    private readonly _id: ItemID,
    private readonly _type: ItemType | undefined,
    stateManager: StateManager<M>,
  ) {
    this._stateManager = stateManager;

    if(this._stateManager.initialized) {
      this._subscriptions.push(this._stateManager.model.subscribe(() => this._onUpdate.emit(this)));
    }
  }

  get id (): ItemID {
    return this._id;
  }

  get type (): ItemType | undefined {
    return this._type;
  }

  get modelMeta (): ModelMeta {
    return this._stateManager.model.modelMeta;
  }

  get model (): M {
    if(!this._stateManager.initialized) {
      return null as any;
    }

    return this._stateManager.model;
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe (listener: (entity: this) => void) {
    return this._onUpdate.on(listener as any);
  }
}
