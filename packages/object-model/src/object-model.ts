//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { FeedMeta } from '@dxos/echo-protocol';
import { ModelMeta, Model } from '@dxos/model-factory';
import { jsonReplacer } from '@dxos/util';

import { createMultiFieldMutationSet, MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot, schema } from './proto';

const log = debug('dxos:echo:object-model');

/**
 * Object mutation model.
 */
export class ObjectModel extends Model<ObjectMutationSet> {
  static meta: ModelMeta = {
    type: 'wrn://protocol.dxos.org/model/object',
    mutation: schema.getCodecForType('dxos.echo.object.ObjectMutationSet'),

    async getInitMutation (obj: any): Promise<ObjectMutationSet> {
      return {
        mutations: createMultiFieldMutationSet(obj)
      };
    },

    snapshotCodec: schema.getCodecForType('dxos.echo.object.ObjectSnapshot')
  };

  private _object = {};

  /**
   * Returns an immutable object.
   */
  toObject () {
    return cloneDeep(this._object);
  }

  /**
   * Returns the value at `path` of the object.
   * Similar to: https://lodash.com/docs/4.17.15#get
   * @param path
   * @param [defaultValue]
   */
  getProperty (path: string, defaultValue: any = undefined): any {
    return cloneDeep(get(this._object, path, defaultValue));
  }

  // TODO(burdon): Create builder pattern (replace static methods).
  async setProperty (key: string, value: any) {
    const receipt = await this.write({
      mutations: [
        {
          operation: ObjectMutation.Operation.SET,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    });
    await receipt.waitToBeProcessed();
  }

  async setProperties (properties: any) {
    const receipt = await this.write({
      mutations: createMultiFieldMutationSet(properties)
    });
    await receipt.waitToBeProcessed();
  }

  async _processMessage (meta: FeedMeta, message: ObjectMutationSet) {
    log('processMessage', JSON.stringify({ meta, message }, jsonReplacer));
    MutationUtil.applyMutationSet(this._object, message);
    return true;
  }

  createSnapshot () {
    return {
      root: ValueUtil.createMessage(this._object)
    };
  }

  async restoreFromSnapshot (snapshot: ObjectSnapshot) {
    const obj: any = {};
    assert(snapshot.root);
    ValueUtil.applyValue(obj, 'root', snapshot.root);
    this._object = obj.root;
  }
}
