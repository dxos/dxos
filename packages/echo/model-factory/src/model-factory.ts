//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedWriter, ItemID, ModelSnapshot } from '@dxos/echo-protocol';

import { Model } from './model';
import { ModelType, ModelMeta, ModelConstructor, validateModelClass } from './types';
import { StateManager } from './state-manager';

/**
 * Creates Model instances from a registered collection of Model types.
 */
export class ModelFactory {
  readonly registered = new Event<ModelConstructor<any>>();

  private _models = new Map<ModelType, { meta: ModelMeta, constructor: ModelConstructor<any> }>();

  hasModel (modelType: ModelType) {
    return this.getModel(modelType) !== undefined;
  }

  getModel (modelType: ModelType) {
    assert(modelType);
    return this._models.get(modelType);
  }

  getModels () {
    return Array.from(this._models.values());
  }

  // TODO(burdon): Test if already registered.
  registerModel (constructor: ModelConstructor<any>): this {
    validateModelClass(constructor);
    const { meta } = constructor;
    this._models.set(meta.type, { meta, constructor });
    this.registered.emit(constructor);
    return this;
  }

  /**
   * Instantiates new StateManager with the underlying model.
   * @param modelType Model type DXN.
   * @param itemId Id of the item holding the model.
   * @param snapshot Snapshot defining the intial state. `{}` can be provided for empty state.
   * @param writeStream Stream for outbound messages.
   * @returns 
   */
  createModel<M extends Model> (modelType: ModelType, itemId: ItemID, snapshot: ModelSnapshot, writeStream?: FeedWriter<Uint8Array>): StateManager<M> {
    assert(itemId);
    const constructor = this._models.get(modelType)?.constructor;

    return new StateManager(modelType, constructor, itemId, snapshot, writeStream ?? null);
  }

  getModelMeta (modelType: ModelType): ModelMeta {
    if (!this._models.has(modelType)) {
      throw new Error(`Invalid model type: ${modelType}`);
    }

    const { meta } = this._models.get(modelType)!;
    return meta;
  }
}
