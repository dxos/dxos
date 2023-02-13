//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Any, ProtoCodec } from '@dxos/codec-protobuf';
import { createModelMutation, encodeModelMutation, Item, MutateResult } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Model, ModelConstructor, MutationOf, MutationWriteReceipt, StateMachine, StateOf } from '@dxos/model-factory';

import { EchoDatabase } from './database';
import { base, db, id } from './defs';

/**
 * Base class for all echo objects.
 * Can carry different models.
 */
export abstract class EchoObject<T extends Model = any> {
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

  constructor(modelConstructor: ModelConstructor<T>) {
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
          waitToBeProcessed: () => Promise.resolve()
        };
      }
    );
  }

  /** Proxied object. */
  [base]: this = this;

  /** ID accessor. */
  // TODO(burdon): Expose as property?
  get [id](): string {
    return this[base]._id;
  }

  /** Database reference if bound. */
  get [db](): EchoDatabase | undefined {
    return this[base]._database;
  }

  /**
   * Called after object is bound to database.
   */
  protected async _onBind(): Promise<void> {}

  /**
   * @internal
   */
  // TODO(burdon): Document.
  async _bind(item: Item<T>) {
    // TODO(dmaretskyi): Snapshot and unbind local state machine.
    this._stateMachine = undefined;
    this._item = item;

    await this._onBind();
  }

  /**
   * Snapshot current state.
   * @internal
   */
  _createSnapshot(): Any {
    if (this._stateMachine) {
      assert(this._modelConstructor.meta.snapshotCodec);
      return (this._modelConstructor.meta.snapshotCodec as ProtoCodec).encodeAsAny(this._stateMachine.snapshot());
    } else {
      throw new Error('Only implemented on unpersisted objects.');
    }
  }

  protected _getState(): StateOf<T> {
    if (this._stateMachine) {
      return this._stateMachine.getState();
    } else {
      assert(this._item);
      return this._item._stateManager.state;
    }
  }

  /**
   * @returns Is this object currently persisted in the database.
   */
  protected _isPersisted(): boolean {
    return !!this._item;
  }

  /**
   * Perform mutation on this object's state.
   * Mutation is applied optimistically: calls to _getState() will return mutated state.
   * @returns Mutation result for the database or undefined if the current object is not persisted.
   */
  protected _mutate(mutation: MutationOf<T>): MutateResult | undefined {
    if (this._stateMachine) {
      this._stateMachine.process(mutation);
    } else {
      assert(this._database);
      return this._database._backend.mutate(
        createModelMutation(this._id, encodeModelMutation(this._model!.modelMeta, mutation))
      );
    }
  }
}
