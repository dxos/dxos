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
    // Model updates mean Item updates, so make sure we are subscribed as well.
    this._setModel(stateManager);
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
    return this._stateManager.model;
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe (listener: (entity: this) => void) {
    return this._onUpdate.on(listener as any);
  }

  /**
   * @internal
   */
  _setModel (stateManager: StateManager<M>) {
    this._stateManager = stateManager;

    this._subscriptions.unsubscribe();
    this._subscriptions.push(this._stateManager.model.subscribe(() => this._onUpdate.emit(this)));
  }
}
