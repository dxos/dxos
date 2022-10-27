//
// Copyright 2021 DXOS.org
//

import { Event, EventSubscriptions } from '@dxos/async';
import { Model, ModelMeta, StateManager } from '@dxos/model-factory';
import { ItemID, ItemType } from '@dxos/protocols';

import { ItemManager } from './item-manager';

/**
 * Base class for all ECHO entitities.
 *
 * Subclassed by Item and Link.
 */
export class Entity<M extends Model | null = Model> {
  // Called whenever item processes mutation.
  protected readonly _onUpdate = new Event<Entity<any>>();

  private readonly _subscriptions = new EventSubscriptions();

  /**
   * @internal
   */
  public _stateManager!: StateManager<NonNullable<M>>;

  constructor(
    protected readonly _itemManager: ItemManager,
    private readonly _id: ItemID,
    private readonly _type: ItemType | undefined,
    stateManager: StateManager<NonNullable<M>>
  ) {
    this._stateManager = stateManager;

    if (this._stateManager.initialized) {
      this._subscriptions.add(this._stateManager.model.subscribe(() => this._onUpdate.emit(this)));
    }
  }

  get id(): ItemID {
    return this._id;
  }

  get type(): ItemType | undefined {
    return this._type;
  }

  get modelType(): string {
    return this._stateManager.modelType;
  }

  get modelMeta(): ModelMeta {
    return this._stateManager.model.modelMeta;
  }

  get model(): M {
    if (!this._stateManager.initialized) {
      return null as any;
    }

    return this._stateManager.model;
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe(listener: (entity: this) => void) {
    return this._onUpdate.on(listener as any);
  }
}
