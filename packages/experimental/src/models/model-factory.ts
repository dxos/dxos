//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { ItemID } from '../items';
import { Model } from './model';
import { ModelType, ModelConstructor } from './types';

/**
 * Creates Model instances from a registered collection of Model types.
 */
export class ModelFactory {
  private _models = new Map<ModelType, ModelConstructor<any>>();

  // TODO(burdon): Require version.

  hasModel (modelType: ModelType) {
    assert(modelType);
    return this._models.has(modelType);
  }

  registerModel (modelType: ModelType, modelConstructor: ModelConstructor<any>): ModelFactory {
    assert(modelType);
    assert(modelConstructor);
    this._models.set(modelType, modelConstructor);
    return this;
  }

  createModel<T extends Model<any>> (modelType: ModelType, itemId: ItemID, writable?: NodeJS.WritableStream): T {
    assert(itemId);

    const modelConstructor = this._models.get(modelType) as ModelConstructor<T>;
    if (!modelConstructor) {
      throw new Error(`Invalid model type: ${modelType}`);
    }

    // eslint-disable-next-line new-cap
    return new modelConstructor(itemId, writable);
  }
}
