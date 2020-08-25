//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { FeedMeta } from '@dxos/experimental-echo-protocol';
import { ModelMeta, Model } from '@dxos/experimental-model-factory';
import { checkType, jsonReplacer } from '@dxos/experimental-util';

import { dxos as _dxos } from './proto/gen/object';

import { MutationUtil, ValueUtil } from './mutation';

const log = debug('dxos:echo:object-model');

/**
 * Object mutation model.
 */
export class ObjectModel extends Model<_dxos.echo.object.IObjectMutationSet> {
  static meta: ModelMeta = {
    type: 'wrn://dxos.org/model/object',
    mutation: 'dxos.echo.object.ObjectMutationSet'
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
    await this.write(checkType<_dxos.echo.object.IObjectMutationSet>({
      mutations: [
        {
          // TODO(burdon): Namespace conflict when imported into echo-db.
          operation: 0, // _dxos.echo.object.ObjectMutation.Operation.SET,
          key,
          value: ValueUtil.createMessage(value)
        }
      ]
    }));
  }

  async _processMessage (meta: FeedMeta, messsage: _dxos.echo.object.IObjectMutationSet) {
    log('processMessage', JSON.stringify({ meta, messsage }, jsonReplacer));
    MutationUtil.applyMutationSet(this._object, messsage);
    return true;
  }
}
