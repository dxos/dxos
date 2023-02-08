//
// Copyright 2020 DXOS.org
//

import get from 'lodash.get';
import assert from 'node:assert';

import { ModelMeta, Model, StateMachine } from '@dxos/model-factory';
import { schema } from '@dxos/protocols';
import { ObjectMutation, ObjectMutationSet, ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';

import { DocumentModelState, MutationUtil, ValueUtil } from './mutation';
import { OrderedArray } from './ordered-array';
import { validateKey } from './util';

/**
 * Processes object mutations.
 */
class DocumentModelStateMachine implements StateMachine<DocumentModelState, ObjectMutationSet, ObjectSnapshot> {
  private _object: DocumentModelState = { data: {} };

  getState(): DocumentModelState {
    return this._object;
  }

  reset(snapshot: ObjectSnapshot): void {
    assert(snapshot.root);
    const object: DocumentModelState = { data: {} };
    ValueUtil.applyValue(object, 'data', snapshot.root);
    this._object = object;
    this._object.type = snapshot.type;
  }

  process(mutation: ObjectMutationSet): void {
    MutationUtil.applyMutationSet(this._object, mutation);
  }

  snapshot(): ObjectSnapshot {
    return {
      root: ValueUtil.createMessage(this._object.data),
      type: this._object.type
    };
  }
}

/**
 * Batch mutation builder.
 */
export class MutationBuilder {
  _mutations: ObjectMutation[] = [];

  // prettier-ignore
  constructor(
    private readonly _model: DocumentModel
  ) { }

  set(key: string, value: any) {
    this._mutations.push(MutationUtil.createFieldMutation(key, value));
    return this;
  }

  private _yjsTransact(key: string, tx: (arr: OrderedArray) => void): this {
    const arrayInstance = this._model.get(key);
    assert(arrayInstance instanceof OrderedArray);
    const mutation = arrayInstance.transact(() => {
      tx(arrayInstance);
    });

    this._mutations.push({
      operation: ObjectMutation.Operation.YJS,
      key,
      mutation
    });

    return this;
  }

  arrayInsert(key: string, index: number, content: any[]): this {
    return this._yjsTransact(key, (arrayInstance) => {
      arrayInstance.insert(index, content);
    });
  }

  arrayDelete(key: string, index: number, length?: number): this {
    return this._yjsTransact(key, (arrayInstance) => {
      arrayInstance.delete(index, length);
    });
  }

  arrayPush(key: string, content: any[]): this {
    return this._yjsTransact(key, (arrayInstance) => {
      arrayInstance.push(content);
    });
  }

  arrayUnshift(key: string, content: any[]): this {
    return this._yjsTransact(key, (arrayInstance) => {
      arrayInstance.unshift(content);
    });
  }

  async commit() {
    return this._model._makeMutation({ mutations: this._mutations });
  }

  /**
   * Returns a mutation object without applying it.
   */
  build(): ObjectMutationSet {
    return { mutations: this._mutations };
  }
}

/**
 * Defines generic object accessor.
 */
// TODO(burdon): Replace with object model.
export interface ObjectProperties {
  get(key: string, defaultValue?: unknown): any;
  set(key: string, value: unknown): Promise<void>;
}

/**
 * Object mutation model.
 */
// TODO(burdon): Make generic (separate model?) With read/write validation.
export class DocumentModel extends Model<DocumentModelState, ObjectMutationSet> implements ObjectProperties {
  static meta: ModelMeta = {
    type: 'dxos:model/document',
    stateMachine: () => new DocumentModelStateMachine(),
    mutationCodec: schema.getCodecForType('dxos.echo.model.document.ObjectMutationSet'),

    // TODO(burdon): Remove.
    getInitMutation({ obj, type }: { obj: Record<string, any>; type: string }): ObjectMutationSet {
      return {
        mutations: obj ? MutationUtil.createMultiFieldMutation(obj) : [],
        type
      };
    },

    snapshotCodec: schema.getCodecForType('dxos.echo.model.document.ObjectSnapshot')
  };

  /**
   * Returns an immutable object.
   */
  toObject() {
    return this._getState();
  }

  builder() {
    return new MutationBuilder(this);
  }

  get(key: string, defaultValue?: unknown) {
    validateKey(key);
    return get(this._getState().data, key, defaultValue);
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
