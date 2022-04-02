//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { ModelMeta, Model, StateMachine, MutationProcessMeta } from '@dxos/model-factory';

import { createMultiFieldMutationSet, MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot, schema } from './proto';

/**
 * Processes object mutations.
 */
class ObjectModelStateMachine implements StateMachine<Record<string, any>, ObjectMutationSet, ObjectSnapshot> {
  private _object = {};

  getState (): Record<string, any> {
    return this._object;
  }

  process (mutation: ObjectMutationSet, meta: MutationProcessMeta): void {
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
export class ObjectModel extends Model<Record<string, any>, ObjectMutationSet> {
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
  getProperty (key: string, defaultValue: any = undefined): any {
    return cloneDeep(get(this._getState(), key, defaultValue));
  }

  /**
   * @deprecated
   */
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
  // TODO(burdon): Array of key/values?
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
