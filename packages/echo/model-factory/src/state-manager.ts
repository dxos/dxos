//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedWriter, ItemID, ModelSnapshot, MutationMeta, MutationMetaWithTimeframe } from '@dxos/echo-protocol';

import { Model } from './model';
import { getInsertionIndex } from './ordering';
import { StateMachine } from './state-machine';
import { ModelConstructor, ModelMessage, ModelMeta, ModelType, MutationOf, MutationWriteReceipt, StateOf } from './types';

/**
 * Binds the model to the state machine. Manages the state machine lifecycle.
 */
export class StateManager<M extends Model> {
  /**
   * Mutations that were applied on top of the _snapshot.
   */
  private _mutations: ModelMessage<Uint8Array>[] = [];

  private _modelMeta: ModelMeta | null = null;

  private _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown> | null = null;

  private _model: M | null = null;

  private readonly _mutationProcessed = new Event<MutationMeta>();

  /**
   * @param _modelType
   * @param modelConstructor Model's constructor, can be undefined if the registry currently doesn't have this model.
   * @param _itemId
   * @param _writeStream
   */
  constructor (
    private readonly _modelType: ModelType,
    modelConstructor: ModelConstructor<M> | undefined,
    private readonly _itemId: ItemID,
    private _snapshot: ModelSnapshot,
    private readonly _writeStream: FeedWriter<Uint8Array> | null
  ) {
    if (modelConstructor) {
      this.initialize(modelConstructor);
    }
  }

  get initialized (): boolean {
    return !!this._modelMeta;
  }

  get modelType (): ModelType {
    return this._modelType;
  }

  get modelMeta (): ModelMeta {
    assert(this._modelMeta, 'Model not initialized.');
    return this._modelMeta;
  }

  get model (): M {
    assert(this._model, 'Model not initialized.');
    return this._model;
  }

  /**
   * Writes the mutation to the output stream.
   */
  private async _write (mutation: MutationOf<M>): Promise<MutationWriteReceipt> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    // Promise that resolves when this mutation has been processed.
    const processed = this._mutationProcessed.waitFor(meta =>
      receipt.feedKey.equals(meta.feedKey) && meta.seq === receipt.seq
    );

    const mutationEncoded = this.modelMeta.mutation.encode(mutation);
    const receipt = await this._writeStream.write(mutationEncoded);

    return {
      ...receipt,
      waitToBeProcessed: async () => {
        await processed;
      }
    };
  }

  private _resetStateMachine () {
    assert(this._modelMeta, 'Model not initialized.');

    this._stateMachine = this._modelMeta.stateMachine();

    if (this._snapshot.snapshot) {
      assert(this._modelMeta.snapshotCodec);
      const decoded = this._modelMeta.snapshotCodec.decode(this._snapshot.snapshot);
      this._stateMachine.reset(decoded);
    }

    for (const mutaton of this._snapshot.mutations ?? []) {
      const mutationDecoded = this.modelMeta.mutation.decode(mutaton.mutation);
      this._stateMachine.process(mutationDecoded, mutaton.meta);
    }

    for (const mutation of this._mutations) {
      this._stateMachine.process(this._modelMeta.mutation.decode(mutation.mutation), mutation.meta);
    }
  }

  /**
   * Perform late intitalization.
   *
   * Only possible if the modelContructor wasn't passed during StateManager's creation.
   */
  initialize (modelConstructor: ModelConstructor<M>) {
    assert(!this._modelMeta, 'Already iniitalized.');

    this._modelMeta = modelConstructor.meta;

    this._resetStateMachine();

    // eslint-disable-next-line new-cap
    this._model = new modelConstructor(
      this._modelMeta,
      this._itemId,
      () => this._stateMachine!.getState(),
      this._writeStream ? mutation => this._write(mutation) : undefined
    );
  }

  /**
   * Process mutation from the inbound stream.
   */
  processMessage (meta: MutationMetaWithTimeframe, mutation: Uint8Array) {
    const insertionIndex = getInsertionIndex(this._mutations, { meta, mutation });
    if (insertionIndex !== this._mutations.length) {
      // Order will be broken, reset the state machine and re-apply all mutations.
      this._mutations = [
        ...this._mutations.slice(0, insertionIndex - 1),
        { meta, mutation },
        ...this._mutations.slice(insertionIndex)
      ];
      this._resetStateMachine();
    } else {
      // Mutation can safely be append at the end preserving order.
      this._mutations.push({ meta, mutation });
      if (this.initialized) {
        const mutationDecoded = this.modelMeta.mutation.decode(mutation);
        this._stateMachine!.process(mutationDecoded, meta);

        this._model!.update.emit(this._model!);
        this._mutationProcessed.emit(meta);
      }
    }
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot (): ModelSnapshot {
    if (this.initialized && this.modelMeta.snapshotCodec) {
      // Returned reduced snapshot if possible.
      return {
        snapshot: this.modelMeta.snapshotCodec.encode(this._stateMachine!.snapshot())
      };
    }

    return {
      snapshot: this._snapshot.snapshot,
      mutations: [
        ...(this._snapshot.mutations ?? []),
        ...this._mutations
      ]
    };
  }

  /**
   * Reset the state to existing snapshot.
   */
  resetToSnapshot (snapshot: ModelSnapshot) {
    this._snapshot = snapshot;
    this._mutations = [];

    if (this.initialized) {
      this._resetStateMachine();
      this._model!.update.emit(this._model!);
    }
  }
}
