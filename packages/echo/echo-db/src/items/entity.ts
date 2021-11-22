//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { Model, ModelMeta } from '@dxos/model-factory';
import { SubscriptionGroup } from '@dxos/util';

/**
 * Base class for all ECHO entitities.
 *
 * Subclassed by Item and Link.
 */
export class Entity<M extends Model> {
    // Called whenever item processes mutation.
    protected readonly _onUpdate = new Event<Entity<any>>();

    private readonly _subscriptions = new SubscriptionGroup(); 

    constructor (
        private readonly _id: ItemID,
        private readonly _type: ItemType | undefined,
        private readonly _modelMeta: ModelMeta,
        private _model: M
    ) {
      // Model updates mean Item updates, so make sure we are subscribed as well.
      this._setModel(_model);
    }

    get id (): ItemID {
      return this._id;
    }

    get type (): ItemType | undefined {
      return this._type;
    }

    get modelMeta (): ModelMeta {
      return this._modelMeta;
    }

    get model (): M {
      return this._model;
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
    _setModel(model: M) {
      this._model = model;

      this._subscriptions.unsubscribe();
      this._subscriptions.push(this._model.subscribe(() => this._onUpdate.emit(this)))
    }
}
