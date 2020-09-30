//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { ItemID } from '@dxos/echo-protocol';

import { Model } from './model';
import { ModelType, ModelMeta, ModelConstructor } from './types';

/**
 * Creates Model instances from a registered collection of Model types.
 */
export class ModelFactory {
  private _models = new Map<ModelType, { meta: ModelMeta, constructor: ModelConstructor<any> }>();

  // TODO(burdon): Require version.

  hasModel (modelType: ModelType) {
    assert(modelType);
    return this._models.has(modelType);
  }

  registerModel (meta: ModelMeta, constructor: ModelConstructor<any>): ModelFactory {
    assert(meta && meta.type && meta.mutation);
    assert(constructor);
    this._models.set(meta.type, { meta, constructor });
    return this;
  }

  createModel<T extends Model<any>> (modelType: ModelType, itemId: ItemID, writeStream?: NodeJS.WritableStream): T {
    assert(itemId);
    if (!this._models.has(modelType)) {
      throw new Error(`Invalid model type: ${modelType}`);
    }

    const { meta, constructor } = this._models.get(modelType)!;

    // eslint-disable-next-line new-cap
    return new constructor(meta, itemId, writeStream);
  }

  getModelMeta (modelType: ModelType): ModelMeta {
    if (!this._models.has(modelType)) {
      throw new Error(`Invalid model type: ${modelType}`);
    }
    const { meta } = this._models.get(modelType)!;
    return meta;
  }
}
