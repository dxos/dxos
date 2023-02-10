//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, scheduleTask } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import type { FeedWriter, WriteReceipt } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import type { MutationMeta, MutationMetaWithTimeframe, ItemID } from '@dxos/protocols';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';

import { Model } from './model';
import { getInsertionIndex } from './ordering';
import {
  ModelConstructor,
  ModelMessage,
  ModelMeta,
  ModelType,
  MutationOf,
  MutationWriteReceipt,
  StateOf,
  StateMachine
} from './types';

type OptimisticMutation = {
  tag?: string;

  mutation: Any;
};

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
  private readonly _pendingWrites = new Set<Promise<any>>();
  private readonly _mutationProcessed = new Event<MutationMeta>();

  @logInfo
  public _debugLabel: string | undefined;

  public readonly update = new Event();

  public _modelMeta: ModelMeta | null = null;
  private _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown> | null = null;

  /**
   * Mutations that were applied on top of the _snapshot.
   */
  private _mutations: ModelMessage<Any>[] = [];

  /**
   * Mutations that were optimistically applied and haven't yet passed through the feed store.
   */
  private _optimisticMutations: OptimisticMutation[] = [];

  /**
   * @param modelConstructor Can be undefined if the registry currently doesn't have this model loaded,
   *  in which case it may be initialized later.
   */
  constructor(
    private readonly _modelType: ModelType,
    modelConstructor: ModelConstructor<M> | undefined,
    private readonly _itemId: ItemID,
    private _initialState: EchoObject,
    private readonly _memberKey: PublicKey,
    private readonly _feedWriter: FeedWriter<Any> | null
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

  get state(): StateOf<M> {
    assert(this._stateMachine, 'State machine not initialized.');
    return this._stateMachine.getState();
  }

  get modelMeta(): ModelMeta {
    assert(this._modelMeta, 'Model not initialized.');
    return this._modelMeta;
  }

  async destroy() {
    log('destroy');
    try {
      await Promise.all(this._pendingWrites);
    } catch { }
  }

  private _emitUpdate() {
    this.update.emit();
  }

  processOptimisticMutation(mutation: MutationOf<M>, clientTag?: string) {
    log.info('process optimistic mutation', { clientTag, mutation });
    // Construct and enqueue an optimistic mutation.
    const mutationEncoded = {
      type_url: 'todo', // TODO(mykola): this._modelMeta!.mutationCodec.typeUrl ???
      value: this._modelMeta!.mutationCodec.encode(mutation)
    };
    const optimisticMutation: OptimisticMutation = {
      tag: clientTag,
      mutation: mutationEncoded
    };
    this._optimisticMutations.push(optimisticMutation);

    // Process mutation if initialzied, otherwise deferred until state-machine is loaded.
    if (this.initialized) {
      log('Optimistic apply', mutation);
      this._stateMachine!.process(mutation);
      this._emitUpdate();
    }

    return optimisticMutation;
  }

  // async confirm(mutation: OptimisticMutation, receipt: WriteReceipt): Promise<MutationWriteReceipt> {
  //   log('Confirm', mutation);
  //   mutation.receipt = receipt;

  //   // Promise that resolves when this mutation has been processed.
  //   const processed = this._mutationProcessed.waitFor(
  //     (meta) => receipt.feedKey.equals(meta.feedKey) && meta.seq === receipt.seq
  //   );

  //   // Sanity checks.
  //   void processed.then(() => {
  //     if (!mutation.receipt) {
  //       log.error('Optimistic mutation was processed without being confirmed', {
  //         itemId: this._itemId
  //       });
  //     }
  //     if (this._optimisticMutations.includes(mutation)) {
  //       log.error('Optimistic mutation was processed without being removed from the optimistic queue', {
  //         itemId: this._itemId
  //       });
  //     }
  //   });

  //   return {
  //     ...receipt,
  //     waitToBeProcessed: async () => {
  //       await processed;
  //     }
  //   };
  // }

  /**
   * Re-creates the state machine based on the current snapshot and enqueued mutations.
   */
  private _resetStateMachine() {
    assert(this._modelMeta, 'Model not initialized.');
    log('Construct state machine');

    this._stateMachine = this._modelMeta.stateMachine();

    // Apply the snapshot.
    if (this._initialState.snapshot) {
      assert(this._modelMeta.snapshotCodec);
      const decoded = this._modelMeta.snapshotCodec.decode(this._initialState.snapshot.model.value);
      this._stateMachine.reset(decoded);
    }

    // Apply mutations passed with the snapshot.
    for (const mutation of this._initialState.mutations ?? []) {
      if (!mutation.model) {
        continue;
      }

      const mutationDecoded = this._modelMeta.mutationCodec.decode(mutation.model.value);
      this._stateMachine.process(mutationDecoded);
    }

    // Apply mutations that were read from the inbound stream.
    for (const mutation of this._mutations) {
      this._stateMachine.process(this._modelMeta.mutationCodec.decode(mutation.mutation.value));
    }

    // Apply optimistic mutations.
    for (const mutation of this._optimisticMutations) {
      this._stateMachine.process(this._modelMeta.mutationCodec.decode(mutation.mutation.value));
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
  }

  /**
   * Processes mutations from the inbound stream.
   */
  processMessage(meta: MutationMetaWithTimeframe, mutation: Any, clientTag?: string) {
    // Remove optimistic mutation from the queue.
    const optimisticIndex = this._optimisticMutations.findIndex(
      (message) =>
        (message.tag && message.tag === clientTag)
    );
    if (optimisticIndex !== -1) {
      this._optimisticMutations.splice(optimisticIndex, 1);
    }

    // Insert the mutation into the mutation queue at the right position.
    const insertionIndex = getInsertionIndex(this._mutations, {
      meta,
      mutation
    });
    const lengthBefore = this._mutations.length;
    this._mutations.splice(insertionIndex, 0, { meta, mutation });
    log.info('process message', {
      feed: PublicKey.from(meta.feedKey),
      seq: meta.seq,
      clientTag,
      insertionIndex,
      optimisticIndex,
      lengthBefore,
      mutation: this._modelMeta?.mutationCodec.decode(mutation.value),
    });

    // Perform state updates.
    if (this.initialized) {
      // Reset the state machine if processing this mutation would break the order.
      if (
        insertionIndex !== lengthBefore ||
        optimisticIndex > 0 ||
        (optimisticIndex === -1 && this._optimisticMutations.length > 0)
      ) {
        // Order will be broken, reset the state machine and re-apply all mutations.
        log('Reset due to order change');
        this._resetStateMachine();
      } else if (optimisticIndex === -1) {
        log(`Apply ${JSON.stringify(meta)}`);
        // Mutation can safely be append at the end preserving order.
        const mutationDecoded = this._modelMeta!.mutationCodec.decode(mutation.value);
        this._stateMachine!.process(mutationDecoded);
        this._emitUpdate();
      }
    }

    // Notify listeners that the mutation has been processed.
    scheduleTask(new Context(), () => this._mutationProcessed.emit(meta));
  }

  /**
   * Create a snapshot of the current state.
   */
  // TODO(dmaretskyi): Lift to ObjectState class.
  createSnapshot(): EchoObject {
    if (this.initialized && this.modelMeta.snapshotCodec) {
      // Returned reduced snapshot if possible.
      return {
        objectId: this._itemId,
        snapshot: {
          model: {
            '@type': 'google.protobuf.Any',
            typeUrl: 'todo', // TODO(mykola): use model type.
            value: this.modelMeta.snapshotCodec.encode(this._stateMachine!.snapshot())
          }
        }
      };
    }

    return {
      objectId: this._itemId,
      snapshot: this._initialState.snapshot,
      mutations: [
        ...(this._initialState.mutations ?? []),
        ...this._mutations.map((mutation) => ({
          model: mutation.mutation,
          meta: mutation.meta
        }))
      ]
    };
  }

  /**
   * Reset the state to existing snapshot.
   */
  resetToSnapshot(snapshot: EchoObject) {
    this._initialState = snapshot;
    this._mutations = [];

    if (this.initialized) {
      this._resetStateMachine();
      this._emitUpdate();
    }
  }
}
