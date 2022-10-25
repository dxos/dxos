//
// Copyright 2020 DXOS.org
//

import cloneDeep from 'lodash.clonedeep';
import get from 'lodash.get';
import assert from 'node:assert';

import { ModelMeta, Model, StateMachine, MutationProcessMeta } from '@dxos/model-factory';
import { schema } from '@dxos/protocols';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/object';

import { MutationUtil, ValueUtil } from './mutation';
import { validateKey } from './util';

export type ObjectModelState = Record<string, any>;

/**
 * Processes object mutations.
 */
class ObjectModelStateMachine implements StateMachine<ObjectModelState, ObjectMutationSet, ObjectSnapshot> {
  private _object: ObjectModelState = {};

  getState(): ObjectModelState {
    return this._object;
  }

  reset(snapshot: ObjectSnapshot): void {
    assert(snapshot.root);
    const object: any = {};
    ValueUtil.applyValue(object, 'root', snapshot.root);
    this._object = object.root;
  }

  process(mutation: ObjectMutationSet, meta: MutationProcessMeta): void {
    MutationUtil.applyMutationSet(this._object, mutation);
  }

  snapshot(): ObjectSnapshot {
    return {
      root: ValueUtil.createMessage(this._object)
    };
  }
}

/**
 * Batch mutation builder.
 */
export class MutationBuilder {
  _mutations: ObjectMutation[] = [];

  constructor(private readonly _model: ObjectModel) {}

  set(key: string, value: any) {
    this._mutations.push(MutationUtil.createFieldMutation(key, value));
    return this;
  }

  async commit() {
    return this._model._makeMutation({ mutations: this._mutations });
  }
}

/**
 * Defines generic object accessor.
 */
export interface ObjectProperties {
  get(key: string, defaultValue?: unknown): any;
  set(key: string, value: unknown): Promise<void>;
}

/**
 * Object mutation model.
 */
// TODO(burdon): Make generic (separate model?) With read/write validation.
export class ObjectModel extends Model<ObjectModelState, ObjectMutationSet> implements ObjectProperties {
  static meta: ModelMeta = {
    type: 'dxos:model/object',
    stateMachine: () => new ObjectModelStateMachine(),
    mutationCodec: schema.getCodecForType('dxos.echo.model.object.ObjectMutationSet'),

    // TODO(burdon): Remove.
    async getInitMutation(obj: any): Promise<ObjectMutationSet> {
      return {
        mutations: MutationUtil.createMultiFieldMutation(obj)
      };
    },

    snapshotCodec: schema.getCodecForType('dxos.echo.model.object.ObjectSnapshot')
  };

  /**
   * Returns an immutable object.
   */
  toObject() {
    return cloneDeep(this._getState());
  }

  builder() {
    return new MutationBuilder(this);
  }

  get(key: string, defaultValue?: unknown) {
    validateKey(key);
    return cloneDeep(get(this._getState(), key, defaultValue));
  }

  async set(key: string, value: unknown) {
    validateKey(key);
    await this._makeMutation({
      mutations: [MutationUtil.createFieldMutation(key, value)]
    });
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  getProperty(key: string, defaultValue: any = undefined): any {
    return this.get(key, defaultValue);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  async setProperty(key: string, value: any) {
    await this.set(key, value);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  async setProperties(properties: any) {
    await this._makeMutation({
      mutations: MutationUtil.createMultiFieldMutation(properties)
    });
  }

  async addToSet(key: string, value: any) {
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

  async removeFromSet(key: string, value: any) {
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

  async pushToArray(key: string, value: any) {
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

  /**
   * @internal
   */
  async _makeMutation(mutation: ObjectMutationSet) {
    const receipt = await this.write(mutation);
    await receipt.waitToBeProcessed();
  }
}
