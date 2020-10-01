//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { FeedMeta } from '@dxos/echo-protocol';
import { ModelMeta, Model } from '@dxos/model-factory';
import { checkType, jsonReplacer } from '@dxos/util';

import { MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation, ObjectMutationSet, schema } from './proto';

const log = debug('dxos:echo:object-model');

/**
 * Object mutation model.
 */
export class ObjectModel extends Model<ObjectMutationSet> {
  static meta: ModelMeta = {
    type: 'wrn://protocol.dxos.org/model/object',
    mutation: schema.getCodecForType('dxos.echo.object.ObjectMutationSet')
  };

  private _object = {};

  /**
   * Returns an immutable object.p
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
    await this.write(checkType<ObjectMutationSet>({
      mutations: [
        {
          operation: ObjectMutation.Operation.SET,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    }));

    // Wait for the property to by updated so that getProperty will return the expected value.
    // TODO(telackey): It would be better if we could check for a unique ID per mutation rather than the value.
    const match = () => this.getProperty(key) === value;
    if (!match()) {
      await this._modelUpdate.waitFor(match);
    }
  }

  async _processMessage (meta: FeedMeta, message: ObjectMutationSet) {
    log('processMessage', JSON.stringify({ meta, message }, jsonReplacer));
    MutationUtil.applyMutationSet(this._object, message);
    return true;
  }
}
