//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { ModelMeta, Model, StateMachine, MutationProcessMeta } from '@dxos/model-factory';

import { createMultiFieldMutationSet, MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot, schema } from './proto';

export type ObjectModelState = Record<string, any>

/**
 * Processes object mutations.
 */
class ObjectModelStateMachine implements StateMachine<ObjectModelState, ObjectMutationSet, ObjectSnapshot> {
  private _object: ObjectModelState = {};

  getState (): ObjectModelState {
    return this._object;
  }

  reset (snapshot: ObjectSnapshot): void {
    assert(snapshot.root);
    const object: any = {};
    ValueUtil.applyValue(object, 'root', snapshot.root);
    this._object = object.root;
  }

  process (mutation: ObjectMutationSet, meta: MutationProcessMeta): void {
    MutationUtil.applyMutationSet(this._object, mutation);
  }

  snapshot (): ObjectSnapshot {
    return {
      root: ValueUtil.createMessage(this._object)
    };
  }
}

/**
 * Object mutation model.
 */
// TODO(burdon): Make generic (separate model?)
export class ObjectModel extends Model<ObjectModelState, ObjectMutationSet> {
  static meta: ModelMeta = {
    type: 'dxos:model/object',
    mutation: schema.getCodecForType('dxos.echo.object.ObjectMutationSet'),
    stateMachine: () => new ObjectModelStateMachine(),

    // TODO(burdon): Remove.
    async getInitMutation (obj: any): Promise<ObjectMutationSet> {
      return {
        mutations: createMultiFieldMutationSet(obj)
      };
    },

    snapshotCodec: schema.getCodecForType('dxos.echo.object.ObjectSnapshot')
  };

  /**
   * Returns an immutable object.
   */
  toObject () {
    return cloneDeep(this._getState());
  }

  get (key: string, defaultValue: any = undefined) {
    return this.getProperty(key, defaultValue);
  }

  async set (key: string, value: any) {
    return this.setProperty(key, value);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  getProperty (key: string, defaultValue: any = undefined): any {
    return cloneDeep(get(this._getState(), key, defaultValue));
  }

  // TODO(burdon): Batch/builder API.
  // E.g., model.batch().set().set().commit().

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  async setProperty (key: string, value: any) {
    await this._makeMutation({
      mutations: [
        {
          operation: ObjectMutation.Operation.SET,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    });
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  async setProperties (properties: any) {
    await this._makeMutation({
      mutations: createMultiFieldMutationSet(properties)
    });
  }

  async addToSet (key: string, value: any) {
    await this._makeMutation({
      mutations: [
        {
          operation: ObjectMutation.Operation.SET_ADD,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    });
  }

  async removeFromSet (key: string, value: any) {
    await this._makeMutation({
      mutations: [
        {
          operation: ObjectMutation.Operation.SET_DELETE,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    });
  }

  async pushToArray (key: string, value: any) {
    await this._makeMutation({
      mutations: [
        {
          operation: ObjectMutation.Operation.ARRAY_PUSH,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    });
  }

  private async _makeMutation (mutation: ObjectMutationSet) {
    const receipt = await this.write(mutation);
    await receipt.waitToBeProcessed();
  }
}
