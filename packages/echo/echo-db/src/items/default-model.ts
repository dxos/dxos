//
// Copyright 2020 DXOS.org
//

import { NOOP_CODEC } from '@dxos/codec-protobuf';
import { ModelMutation, MutationMeta } from '@dxos/echo-protocol';
import { Model, ModelMeta, ModelType, StateMachine } from '@dxos/model-factory';

class DefaultModelStateMachine implements StateMachine<ModelMutation[], Uint8Array, any> {
  private readonly _state: ModelMutation[] = [];

  getState (): ModelMutation[] {
    return this._state;
  }

  process (mutation: Uint8Array, meta: MutationMeta): void {
    this._state.push({ mutation, meta });
  }

  snapshot () {
    throw new Error('Method not implemented.');
  }

  reset (snapshot: any): void {
    throw new Error('Method not implemented.');
  }
}

/**
 * Is instantiated for items that have unregistered types.
 * In case the original model gets registered with model factory later,
 * this model holds enough information to instantiate that model on-the-fly.
 */
// TODO(burdon): Optional. Set as null and ignore messages for items that have unregistered models?
export class DefaultModel extends Model<ModelMutation[], Uint8Array> {
  static meta: ModelMeta = {
    type: 'dxos:model/default',
    stateMachine: () => new DefaultModelStateMachine(),
    mutation: NOOP_CODEC
  };

  public snapshot: Uint8Array | undefined;

  public originalModelType!: ModelType;

  get mutations () {
    return this._getState();
  }
}
