//
// Copyright 2020 DXOS.org
//

import { ModelMutation, MutationMeta } from '@dxos/echo-protocol';
import { Model, ModelMeta, Codec, ModelType } from '@dxos/model-factory';

const noopCodec: Codec<Uint8Array> = {
  encode: (value: Uint8Array) => value,
  decode: (data: Uint8Array) => data
};

/**
 * Is instantiated for items that have non-registered type WRNs.
 *
 * In case the original model gets registered with model factory later, this model holds enough information to instantiate that model on-the-fly.
 */
export class UnknownModel extends Model<Uint8Array> {
  static meta: ModelMeta = {
    type: 'wrn://protocol.dxos.org/model/unknown',
    mutation: noopCodec
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
