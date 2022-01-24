//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { MutationMeta } from '@dxos/echo-protocol';
import { ModelMeta, Model, StateMachine } from '@dxos/model-factory';

import { createMultiFieldMutationSet, MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot, schema } from './proto';

class ObjectModelStateMachiene implements StateMachine<Record<string, any>, ObjectMutationSet, ObjectSnapshot> {
  private _object = {};

  getState (): Record<string, any> {
    return this._object;
  }

  process (mutation: ObjectMutationSet, meta: MutationMeta): void {
    MutationUtil.applyMutationSet(this._object, mutation);
  }

  snapshot (): ObjectSnapshot {
    return {
      root: ValueUtil.createMessage(this._object)
    };
  }

  reset (snapshot: ObjectSnapshot): void {
    const obj: any = {};
    assert(snapshot.root);
    ValueUtil.applyValue(obj, 'root', snapshot.root);
    this._object = obj.root;
  }
}

/**
 * Object mutation model.
 */
export class ObjectModel extends Model<ObjectMutationSet> {
  static meta: ModelMeta = {
    type: 'dxos:model/object',
    mutation: schema.getCodecForType('dxos.echo.object.ObjectMutationSet'),
    stateMachiene: () => new ObjectModelStateMachiene(),

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
  // TODO(burdon): Rename getProperties.
  toObject () {
    return cloneDeep(this._getState());
  }

  /**
   * Returns the value at `path` of the object.
   * Similar to: https://lodash.com/docs/4.17.15#get
   * @param path
   * @param [defaultValue]
   */
  getProperty (path: string, defaultValue: any = undefined): any {
    return cloneDeep(get(this._getState(), path, defaultValue));
  }

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
    // Process the mutations.
    const receipt = await this.write(mutation);
    await receipt.waitToBeProcessed();
  }
}
