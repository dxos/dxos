//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';

import { PublicKey } from '@dxos/crypto';
import { MutationMeta, Timeframe } from '@dxos/echo-protocol';
import { ModelMeta, Model } from '@dxos/model-factory';
import { jsonReplacer } from '@dxos/util';

import { createMultiFieldMutationSet, MutationUtil, ValueUtil } from './mutation';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot, schema } from './proto';

const log = debug('dxos:echo:object-model');

interface ValueMetadata {
  lastMutationTimeframe: Timeframe
  lastMutationFeedKey: PublicKey
}

class LWWData {
  public data = {}

  public metadata: Record<string, ValueMetadata> = {}

  applyMutation (mutation: ObjectMutationSet, meta: MutationMeta) {
    assert(mutation);
    const { mutations } = mutation;
    mutations?.forEach(mutation => {
      assert(mutation.key);

      // if (
      //   this.metadata[mutation.key] &&
      //   Timeframe.compare(this.metadata[mutation.key].lastMutationTimeframe, meta.timeframe) === null &&
      //   PublicKey.from(meta.feedKey).toHex() < this.metadata[mutation.key].lastMutationFeedKey.toHex()
      // ) {
      //   return; // Cancel mutation.
      // }

      MutationUtil.applyMutation(this.data, mutation);

      this.metadata[mutation.key] = {
        lastMutationTimeframe: meta.timeframe,
        lastMutationFeedKey: PublicKey.from(meta.feedKey)
      };
    });
  }

  clone (): LWWData {
    const res = new LWWData();

    res.data = { ...this.data };
    res.metadata = { ...this.metadata };

    return res;
  }
}

/**
 * Object mutation model.
 */
export class ObjectModel extends Model<ObjectMutationSet> {
  static meta: ModelMeta = {
    type: 'dxn://dxos/model/object',
    mutation: schema.getCodecForType('dxos.echo.object.ObjectMutationSet'),

    // TODO(burdon): Remove.
    async getInitMutation (obj: any): Promise<ObjectMutationSet> {
      return {
        mutations: createMultiFieldMutationSet(obj)
      };
    },

    snapshotCodec: schema.getCodecForType('dxos.echo.object.ObjectSnapshot')
  };

  private _object = new LWWData()

  private _pendingObject: object | undefined;

  /**
   * Returns an immutable object.
   */
  toObject () {
    return this._pendingObject ? cloneDeep(this._pendingObject) : cloneDeep(this._object.data);
  }

  /**
   * Returns the value at `path` of the object.
   * Similar to: https://lodash.com/docs/4.17.15#get
   * @param path
   * @param [defaultValue]
   */
  getProperty (path: string, defaultValue: any = undefined): any {
    return cloneDeep(get(this._pendingObject ?? this._object.data, path, defaultValue));
  }

  private async _makeMutation (mutation: ObjectMutationSet) {
    this._pendingObject ??= { ...this._object.data };
    MutationUtil.applyMutationSet(this._pendingObject, mutation);

    const receipt = await this.write(mutation);
    await receipt.waitToBeProcessed();
  }

  // TODO(burdon): Create builder pattern (replace static methods).
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

  createSnapshot () {
    return {
      root: ValueUtil.createMessage(this._object.data)
    };
  }

  async restoreFromSnapshot (snapshot: ObjectSnapshot) {
    const obj: any = {};
    assert(snapshot.root);
    ValueUtil.applyValue(obj, 'root', snapshot.root);
    this._object.data = obj.root;
  }

  async _processMessage (meta: MutationMeta, message: ObjectMutationSet) {
    log('processMessage', JSON.stringify({ meta, message }, jsonReplacer));
    this._object.applyMutation(message, meta);

    // Clear pending updates as the actual state is newer now.
    // TODO(marik-d): What happens when multiple mutations are pending at once?
    this._pendingObject = undefined;
    return true;
  }
}
