//
// Copyright 2020 DXOS.org
//

import { ModelMutation, MutationMeta } from '@dxos/echo-protocol';
import { Model, ModelMeta, ModelType } from '@dxos/model-factory';
import { NOOP_CODEC } from '@dxos/codec-protobuf';

/**
 * Is instantiated for items that have unregistered types.
 * In case the original model gets registered with model factory later,
 * this model holds enough information to instantiate that model on-the-fly.
 */
// TODO(burdon): Optional. Set as null and ignore messages for items that have unregistered models?
export class DefaultModel extends Model<Uint8Array> {
  static meta: ModelMeta = {
    type: 'dxn://dxos/model/default',
    mutation: NOOP_CODEC
  };

  private _mutations: ModelMutation[] = [];

  public snapshot: Uint8Array | undefined;

  public originalModelType!: ModelType;

  get mutations () {
    return this._mutations;
  }

  async _processMessage (meta: MutationMeta, mutation: Uint8Array) {
    this._mutations.push({ meta, mutation });
    return false;
  }
}
