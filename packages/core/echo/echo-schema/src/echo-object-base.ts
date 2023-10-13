//
// Copyright 2022 DXOS.org
//

import { type Any, type ProtoCodec } from '@dxos/codec-protobuf';
import { type Item, type MutateResult, createModelMutation, encodeModelMutation } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import {
  type Model,
  type ModelConstructor,
  type MutationOf,
  type MutationWriteReceipt,
  type StateMachine,
  type StateOf,
} from '@dxos/model-factory';
import { type ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';

import { type EchoDatabase } from './database';
import { type EchoObject, base, db, subscribe } from './defs';
import { createSignal } from './signal';

/**
 * Base class for all echo objects.
 * Can carry different models.
 */
export abstract class EchoObjectBase<T extends Model = any> implements EchoObject {
  /**
   * @internal
   */
  _id = PublicKey.random().toHex();

  /**
   * Not present for freshly created objects.
   * @internal
   */
  _database?: EchoDatabase;

  /**
   * Present only on objects not persisted in the database.
   * @internal
   */
  _stateMachine: StateMachine<StateOf<T>, MutationOf<T>, any> | undefined;

  /**
   * Not present for freshly created objects.
   * @internal
   */
  _item?: Item<T>;

  /**
   * @internal
   */
  _model: T;

  /**
   * @internal
   */
  _modelConstructor: ModelConstructor<T>;

  private _callbacks = new Set<(value: any) => void>();

  protected readonly _signal = createSignal?.();

  protected constructor(modelConstructor: ModelConstructor<T>) {
    this._modelConstructor = modelConstructor;
    this._id = PublicKey.random().toHex();
    this._stateMachine = this._modelConstructor.meta.stateMachine();

    this._model = new this._modelConstructor(
      this._modelConstructor.meta,
      this._id,
      () => this._getState(),
      async (mutation): Promise<MutationWriteReceipt> => {
        this._mutate(mutation);

        // TODO(dmaretskyi): Check if we can remove the requirement to return this data.
        return {
          feedKey: PublicKey.from('00'),
          seq: 0,
          waitToBeProcessed: () => Promise.resolve(),
        };
      },
    );
  }

  /** Proxied object. */
  [base]: this = this;

  /** ID accessor. */
  get id(): string {
    return this[base]._id;
  }

  /** Database reference if bound. */
  get [db](): EchoDatabase | undefined {
    return this[base]._database;
  }

  /**
   * @internal
   * Called before object is bound to database.
   * `_database` is guaranteed to be set.
   */
  _beforeBind(): void {}

  /**
   * @internal
   * Called after object is bound to database.
   */
  protected _afterBind(): void {}

  /**
   * @internal
   */
  _itemUpdate(): void {
    for (const callback of this._callbacks) {
      callback(this);
    }
  }

  [subscribe](callback: (value: any) => void) {
    this[base]._callbacks.add(callback);
    return () => this[base]._callbacks.delete(callback);
  }

  /**
   * @internal
   * Called when the object is imported to the database. Assigns the backing item.
   */
  _bind(item: Item<T>) {
    // TODO(dmaretskyi): Snapshot and unbind local state machine.
    this._stateMachine = undefined;
    this._item = item;
    this._afterBind();
  }

  /**
   * Snapshot current state.
   * @internal
   */
  _createSnapshot(): Any {
    if (this._stateMachine) {
      invariant(this._modelConstructor.meta.snapshotCodec);
      return (this._modelConstructor.meta.snapshotCodec as ProtoCodec).encodeAsAny(this._stateMachine.snapshot());
    } else {
      throw new Error('Only implemented on unpersisted objects.');
    }
  }

  /**
   * @internal
   */
  protected _getState(): StateOf<T> {
    if (this._stateMachine) {
      return this._stateMachine.getState();
    } else {
      invariant(this._item);
      return this._item.state;
    }
  }

  /**
   * @returns Is this object currently persisted in the database.
   * @internal
   */
  protected _isPersisted(): boolean {
    return !!this._item;
  }

  /**
   * Perform mutation on this object's state.
   * Mutation is applied optimistically: calls to _getState() will return mutated state.
   * @returns Mutation result for the database or undefined if the current object is not persisted.
   * @internal
   */
  protected _mutate(mutation: MutationOf<T>): MutateResult | undefined {
    if (this._stateMachine) {
      this._stateMachine.process(mutation);
    } else {
      invariant(this._database);
      return this._database._backend.mutate(
        createModelMutation(this._id, encodeModelMutation(this._model!.modelMeta, mutation)),
      );
    }
  }
}

export const setStateFromSnapshot = (obj: EchoObjectBase, snapshot: ObjectSnapshot) => {
  invariant(obj[base]._stateMachine);
  obj[base]._stateMachine.reset(snapshot);
};

export const forceUpdate = (obj: EchoObjectBase) => {
  obj[base]._itemUpdate();
};
