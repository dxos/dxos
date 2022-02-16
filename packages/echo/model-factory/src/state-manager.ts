//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { FeedWriter, ItemID, ModelSnapshot, MutationMeta, MutationMetaWithTimeframe } from '@dxos/echo-protocol';

import { Model } from './model';
import { getInsertionIndex } from './ordering';
import { StateMachine } from './state-machine';
import { ModelConstructor, ModelMessage, ModelMeta, ModelType, MutationOf, MutationWriteReceipt, StateOf } from './types';

const log = debug('dxos:model-factory:state-manager');
const warn = log.extend('warn');

type OptimisticMutation = {
  mutation: Uint8Array

  meta: MutationMeta

  /**
   * Whether this mutation has been written to the feed store.
   * This also confirms that the feedKey and seq number are correct.
   */
  confirmed: boolean
}

/**
 * Manages the state machine lifecycle.
 * 
 * Snapshots represent the reified state of a set of mutations up until at a particular Timeframe.
 * The state machine maintains a queue of optimistic and committed mutations as they are written to the output stream.
 * Each mutation written to the stream gets a receipt the provides an async callback when the message is written to the store.
 * If another mutation is written to the store ahead of the optimistic mutation,
 * then the state machine is rolled back to the previous snapshot,
 * and the ordered set of mutations since that point is replayed.
 *
 * The state of the model is formed from the following components (in order):
 * - The custom snapshot from the initial state.
 * - The snapshot mutations from the initial state.
 * - The mutatation queue.
 * - Optimistic mutations.
 */
export class StateManager<M extends Model> {
  /**
   * Mutations that were applied on top of the _snapshot.
   */
  private _mutations: ModelMessage<Uint8Array>[] = [];

  /**
   * Mutations that were optimistically applied and haven't yet passed through the feed store.
   */
  private _optimisticMutations: OptimisticMutation[] = [];

  private _modelMeta: ModelMeta | null = null;

  private _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown> | null = null;

  private _model: M | null = null;

  private readonly _mutationProcessed = new Event<MutationMeta>();

  /**
   * @param modelConstructor Can be undefined if the registry currently doesn't have this model loaded,
   *                         in which case it may be initialized later.
   */
  constructor(
    private readonly _modelType: ModelType,
    modelConstructor: ModelConstructor<M> | undefined,
    private readonly _itemId: ItemID,
    private _initialState: ModelSnapshot,
    private readonly _memberKey: PublicKey,
    private readonly _writeStream: FeedWriter<Uint8Array> | null
  ) {
    if (modelConstructor) {
      this.initialize(modelConstructor);
    }
  }

  get initialized(): boolean {
    return !!this._modelMeta;
  }

  get modelType(): ModelType {
    return this._modelType;
  }

  get modelMeta(): ModelMeta {
    assert(this._modelMeta, 'Model not initialized.');
    return this._modelMeta;
  }

  get model(): M {
    assert(this._model, 'Model not initialized.');
    return this._model;
  }

  /**
   * Writes the mutation to the output stream.
   */
  private async _write(mutation: MutationOf<M>): Promise<MutationWriteReceipt> {
    log(`Write ${JSON.stringify(mutation)}`);
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    // Construct and enqueue an optimistic mutation.
    const mutationEncoded = this.modelMeta.mutation.encode(mutation);
    const expectedPosition = this._writeStream.getExpectedPosition();
    const optimisticMutation: OptimisticMutation = {
      mutation: mutationEncoded,
      confirmed: false,
      meta: {
        feedKey: expectedPosition.feedKey.asUint8Array(),
        seq: expectedPosition.seq,
        memberKey: this._memberKey.asUint8Array()
      }
    };
    this._optimisticMutations.push(optimisticMutation);

    // Process mutation if initialzied, otherwise deferred until state-machine is loaded.
    if (this.initialized) {
      log(`Optimistic apply ${JSON.stringify(mutation)}`);
      this._stateMachine!.process(mutation, optimisticMutation.meta);
      this._model!.update.emit(this._model!);
    }

    // Write mutation to the feed store and assign metadata from the receipt.
    // Confirms that the optimistic mutation has been written to the feed store.
    const receipt = await this._writeStream.write(mutationEncoded);
    if (!receipt.feedKey.equals(optimisticMutation.meta.feedKey) || receipt.seq !== optimisticMutation.meta.seq) {
      // TODO(dmaretskyi): Consider having a model-specific sequence number for the snasphots..
      warn(`Mutation came back from the feed store with a different feed key or seq number: optimistic=${PublicKey.from(optimisticMutation.meta.feedKey)}/${optimisticMutation.meta.seq} vs actual=${receipt.feedKey}/${receipt.seq}`);
    }
    log(`Confirm ${JSON.stringify(mutation)}`);
    optimisticMutation.meta.feedKey = receipt.feedKey.asUint8Array();
    optimisticMutation.meta.seq = receipt.seq;
    optimisticMutation.confirmed = true;

    // Promise that resolves when this mutation has been processed.
    const processed = this._mutationProcessed.waitFor(meta =>
      receipt.feedKey.equals(meta.feedKey) && meta.seq === receipt.seq
    );

    // Sanity checks.
    void processed.then(() => {
      if (!optimisticMutation.confirmed) {
        console.error(`Optimistic mutation was processed without being confirmed: ${this._itemId}/${mutation.type}`);
      }
      if (this._optimisticMutations.includes(optimisticMutation)) {
        console.error(`Optimistic mutation was processed without being removed from the optimistic queue: ${this._itemId}/${mutation.type}`);
      }
    });

    return {
      ...receipt,
      waitToBeProcessed: async () => {
        await processed;
      }
    };
  }

  private _resetStateMachine() {
    assert(this._modelMeta, 'Model not initialized.');
    log('Construct state machine');

    this._stateMachine = this._modelMeta.stateMachine();

    // 
    if (this._initialState.snapshot) {
      assert(this._modelMeta.snapshotCodec);
      const decoded = this._modelMeta.snapshotCodec.decode(this._initialState.snapshot);
      this._stateMachine.reset(decoded);
    }

    for (const mutaton of this._initialState.mutations ?? []) {
      const mutationDecoded = this.modelMeta.mutation.decode(mutaton.mutation);
      this._stateMachine.process(mutationDecoded, mutaton.meta);
    }

    for (const mutation of this._mutations) {
      this._stateMachine.process(this._modelMeta.mutation.decode(mutation.mutation), mutation.meta);
    }

    for (const mutation of this._optimisticMutations) {
      this._stateMachine.process(this._modelMeta.mutation.decode(mutation.mutation), mutation.meta);
    }
  }

  /**
   * Perform late intitalization.
   *
   * Only possible if the modelContructor wasn't passed during StateManager's creation.
   */
  initialize(modelConstructor: ModelConstructor<M>) {
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
   * Processes mutations from the inbound stream.
   */
  processMessage(meta: MutationMetaWithTimeframe, mutation: Uint8Array) {
    // Remove optimistic mutation from the queue.
    const optimisticIndex = this._optimisticMutations.findIndex(m =>
      m.confirmed && PublicKey.equals(m.meta.feedKey, meta.feedKey) && m.meta.seq === meta.seq
    );
    if (optimisticIndex !== -1) {
      this._optimisticMutations.splice(optimisticIndex, 1);
    }

    // Insert the mutation into the mutation queue at the right position.
    const insertionIndex = getInsertionIndex(this._mutations, { meta, mutation });
    const lengthBefore = this._mutations.length;
    this._mutations.splice(insertionIndex, 0, { meta, mutation });
    log(`Process ${PublicKey.from(meta.feedKey)}/${meta.seq} insertionIndex=${insertionIndex} optimisticIndex=${optimisticIndex} queue length=${lengthBefore}`);

    // Perform state updates.
    if (this.initialized) {
      // Reset the state machine if processing this mutation would break the order.
      if (insertionIndex !== lengthBefore || optimisticIndex > 0 || (optimisticIndex === -1 && this._optimisticMutations.length > 0)) {
        // Order will be broken, reset the state machine and re-apply all mutations.
        log('Reset due to order change');
        this._resetStateMachine();
      } else if (optimisticIndex === -1) {
        log(`Apply ${JSON.stringify(meta)}`);
        // Mutation can safely be append at the end preserving order.
        const mutationDecoded = this.modelMeta.mutation.decode(mutation);
        this._stateMachine!.process(mutationDecoded, meta);
        this._model!.update.emit(this._model!);
      }
    }

    // Notify listeners that the mutation has been processed.
    this._mutationProcessed.emit(meta);
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot(): ModelSnapshot {
    if (this.initialized && this.modelMeta.snapshotCodec) {
      // Returned reduced snapshot if possible.
      return {
        snapshot: this.modelMeta.snapshotCodec.encode(this._stateMachine!.snapshot())
      };
    }

    return {
      snapshot: this._initialState.snapshot,
      mutations: [
        ...(this._initialState.mutations ?? []),
        ...this._mutations
      ]
    };
  }

  /**
   * Reset the state to existing snapshot.
   */
  resetToSnapshot(snapshot: ModelSnapshot) {
    this._initialState = snapshot;
    this._mutations = [];

    if (this.initialized) {
      this._resetStateMachine();
      this._model!.update.emit(this._model!);
    }
  }
}
