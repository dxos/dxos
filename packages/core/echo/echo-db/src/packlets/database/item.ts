//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { type ProtoCodec } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import {
  type Model,
  type ModelConstructor,
  type ModelMeta,
  type MutationOf,
  type StateMachine,
  type StateOf,
} from '@dxos/model-factory';
import { type ItemID } from '@dxos/protocols';
import { EchoObject, type MutationMeta } from '@dxos/protocols/proto/dxos/echo/object';

import { type ItemManager } from './item-manager';
import { type MutationInQueue, MutationQueue } from './ordering';

/**
 * A globally addressable data item.
 * Items are hermetic data structures contained within a Space. They may be hierarchical.
 * The Item data structure is governed by a Model class, which implements data consistency.
 *
 * Manages the state machine lifecycle.
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
 * - The mutation queue.
 * - Optimistic mutations.
 */
// TODO(dmaretskyi): Rename to ObjectState.
export class Item<M extends Model = Model> {
  private readonly _pendingWrites = new Set<Promise<any>>();
  private readonly _mutationProcessed = new Event<MutationMeta>();

  @logInfo
  public _debugLabel: string | undefined;

  public _modelMeta: ModelMeta | null = null;

  /**
   * Snapshot of the base state of the object.
   */
  private _initialState: EchoObject;

  /**
   * Decoded versions of mutations from _initialState.
   */
  private _initialStateMutations: MutationInQueue<MutationOf<M>>[] = [];

  /**
   * Mutations that were applied on top of the _snapshot.
   */
  private _mutationQueue = new MutationQueue<MutationOf<M>>();

  /**
   * Parent item (or null if this item is a root item).
   */
  private _parent: ItemID | null = null;

  /**
   * Denotes soft delete.
   * Item can be restored until garbage collection (e.g., via snapshots).
   */
  private _deleted = false;

  /**
   * Model state-machine.
   * @internal
   */
  _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown> | null = null;

  /**
   * Items are constructed by the `Database` object.
   * @param itemManager
   * @param objectId        Addressable ID.
   * @param parent        Parent Item (if not a root Item).
   */
  constructor(protected readonly _itemManager: ItemManager, private readonly _id: ItemID) {
    this._initialState = {
      objectId: _id,
    };
  }

  @logInfo
  get id(): ItemID {
    return this._id;
  }

  get modelMeta(): ModelMeta | undefined {
    return this._modelMeta ?? undefined;
  }

  @logInfo
  get modelType(): string {
    invariant(this._modelMeta);
    return this._modelMeta.type;
  }

  @logInfo
  get initialized(): boolean {
    return !!this._modelMeta;
  }

  get deleted() {
    return this._deleted;
  }

  set deleted(value: boolean) {
    this._deleted = value;
  }

  get parent(): ItemID | null {
    return this._parent;
  }

  get state(): StateOf<M> {
    invariant(this._stateMachine);
    return this._stateMachine.getState();
  }

  toString() {
    return `Item(${JSON.stringify({
      objectId: this.id,
      parentId: this.parent,
      deleted: this.deleted,
      type: this.modelMeta?.type,
    })})`;
  }

  /**
   * Perform late intitalization.
   *
   * Only possible if the modelContructor wasn't passed during StateManager's creation.
   */
  initialize(modelConstructor: ModelConstructor<M>) {
    invariant(!this._modelMeta, 'Already iniitalized.');

    this._modelMeta = modelConstructor.meta;
    log('initialize');

    this._resetState();
  }

  /**
   * @internal
   * Waits for pending operations to complete.
   */
  async destroy() {
    log('destroy');
    try {
      await Promise.all(this._pendingWrites);
    } catch {}
  }

  /**
   * Apply mutation.
   * Processes both system metadata & model-specific updates.
   */
  private _applyMutation(entry: MutationInQueue<MutationOf<M>>) {
    log('_processMutation', { entry });
    const { action, parentId, model } = entry.mutation;

    {
      switch (action) {
        case EchoObject.Mutation.Action.DELETE: {
          this._deleted = true;
          break;
        }

        case EchoObject.Mutation.Action.RESTORE: {
          this._deleted = false;
          break;
        }
      }

      // TODO(burdon): Convert to Action.
      if (parentId) {
        this._parent = parentId;
      }
    }

    invariant(!!model === !!entry.decodedModelMutation);
    if (model && this.initialized) {
      this._stateMachine!.process(entry.decodedModelMutation);
    }
  }

  private _decodeMutation(mutation: EchoObject.Mutation): MutationInQueue<MutationOf<M>> {
    invariant(this.modelMeta);
    return {
      mutation,
      decodedModelMutation: !mutation.model ? undefined : this.modelMeta.mutationCodec.decode(mutation.model.value),
    };
  }

  /**
   * Re-creates the state machine based on the current snapshot and enqueued mutations.
   */
  private _resetState() {
    invariant(this._modelMeta, 'Model not initialized.');
    log('Reset state machine');

    this._parent = this._initialState.snapshot?.parentId ?? null;
    this._deleted = this._initialState.snapshot?.deleted ?? false;

    // Apply the snapshot.
    if (this._initialState.snapshot) {
      if (!this._stateMachine) {
        this._stateMachine = this._modelMeta.stateMachine();
      }

      invariant(this._modelMeta.snapshotCodec);
      const decoded = this._modelMeta.snapshotCodec.decode(this._initialState.snapshot.model.value);
      this._stateMachine.reset(decoded);
    } else {
      this._stateMachine = this._modelMeta.stateMachine();
    }

    // Apply mutations passed with the snapshot.
    for (const mutation of this._initialStateMutations) {
      this._applyMutation(mutation);
    }

    for (const mutation of this._mutationQueue.getMutations()) {
      this._applyMutation(mutation);
    }
  }

  processOptimisticMutation(mutation: EchoObject.Mutation) {
    log('process optimistic mutation', { mutation });

    const queueEntry = this._decodeMutation(mutation);
    this._mutationQueue.pushOptimistic(queueEntry);

    // Process mutation if initialzied, otherwise deferred until state-machine is loaded.
    if (this.initialized) {
      log('Optimistic apply', mutation);
      this._applyMutation(queueEntry);
    }
  }

  /**
   * Processes mutations from the inbound stream.
   */
  processMessage(mutation: EchoObject.Mutation) {
    const queueEntry = this._decodeMutation(mutation);
    const { reorder, apply } = this._mutationQueue.pushConfirmed(queueEntry);

    log('process message', {
      mutation: queueEntry.mutation.meta,
      reorder,
      apply,
    });

    // Perform state updates.
    if (this.initialized) {
      // Reset the state machine if processing this mutation would break the order.
      if (reorder) {
        // Order will be broken, reset the state machine and re-apply all mutations.
        log('Reset due to order change');
        this._resetState();
      } else if (apply) {
        log('Apply', { meta: queueEntry.mutation.meta });
        // Mutation can safely be append at the end preserving order.
        this._applyMutation(queueEntry);
      }
    }

    log('test confirmed state', this.state);

    // Notify listeners that the mutation has been processed.
    queueMicrotask(() => this._mutationProcessed.emit(queueEntry.mutation.meta!));
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot(): EchoObject {
    const commonSnapshot: EchoObject = {
      objectId: this._id,
      genesis: {
        modelType: this.modelType,
      },
      snapshot: {
        ...this._initialState.snapshot,
        parentId: this.parent ?? undefined,
        deleted: this.deleted,
      },
    };

    if (this.initialized && this.modelMeta!.snapshotCodec && typeof this._stateMachine?.snapshot === 'function') {
      // If state-machine can create snapshots.
      return {
        ...commonSnapshot,
        snapshot: {
          ...commonSnapshot.snapshot,
          model: (this.modelMeta!.snapshotCodec as ProtoCodec).encodeAsAny(this._stateMachine!.snapshot()),
        },
      };
    } else {
      return {
        ...commonSnapshot,
        mutations: [
          ...(this._initialState.mutations ?? []),
          ...this._mutationQueue.getConfirmedMutations().map((entry) => entry.mutation),
        ],
      };
    }
  }

  /**
   * Reset the state to existing snapshot.
   */
  resetToSnapshot(snapshot: EchoObject) {
    invariant(snapshot.genesis);
    invariant(snapshot.objectId === this._id);

    // We don't reset if this snapshot is a response to the initial optimistic genesis message.
    const needsReset =
      !this._initialState.meta?.clientTag ||
      !!this._initialState.meta?.feedKey ||
      this._initialState.meta?.clientTag !== snapshot.meta?.clientTag;

    this._initialState = snapshot;
    this._initialStateMutations = (this._initialState.mutations ?? []).map((mutation) =>
      this._decodeMutation(mutation),
    );
    log('resetToSnapshot', { needsReset, snapshot });

    if (needsReset) {
      this._mutationQueue.resetConfirmed();

      if (this.initialized) {
        this._resetState();
      }
    }
  }
}

export const getStateMachineFromItem = (item: Item) => {
  return item._stateMachine;
};
