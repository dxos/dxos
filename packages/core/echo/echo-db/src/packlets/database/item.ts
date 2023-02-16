//
// Copyright 2020 DXOS.org
//

import { Event, scheduleTask } from '@dxos/async';
import { Any, ProtoCodec } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { Model, ModelConstructor, ModelMeta, MutationOf, StateMachine, StateOf } from '@dxos/model-factory';
import { ItemID, MutationMetaWithTimeframe } from '@dxos/protocols';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObject, MutationMeta } from '@dxos/protocols/proto/dxos/echo/object';
import assert from 'node:assert';

import { ItemManager } from './item-manager';
import { getInsertionIndex, MutationInQueue } from './ordering';

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
 * - The mutatation queue.
 * - Optimistic mutations.
 */
// TODO(dmaretskyi): Rename to ObjectState.
export class Item<M extends Model = Model> {
  /**
   * Parent item (or null if this item is a root item).
   */
  private _parent: Item<any> | null = null;

  /**
   * Denotes soft delete.
   * Item can be restored until garbage collection (e.g., via snapshots).
   */
  private _deleted = false;

  /**
   * Managed set of child items.
   * @internal
   */
  readonly _children = new Set<Item<any>>();

  // Called whenever item processes mutation.
  protected readonly _onUpdate = new Event<Item<any>>();

  private readonly _pendingWrites = new Set<Promise<any>>();
  private readonly _mutationProcessed = new Event<MutationMeta>();

  @logInfo
  public _debugLabel: string | undefined;

  public _modelMeta: ModelMeta | null = null;
  private _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown> | null = null;


  /**
   * Snapshot of the base state of the object.
   */
  private _initialState: EchoObject;

  /**
   * Mutations that were applied on top of the _snapshot.
   */
  private _mutations: MutationInQueue<MutationOf<M>>[] = [];

  /**
   * Mutations that were optimistically applied and haven't yet passed through the feed store.
   */
  private _optimisticMutations: MutationInQueue<MutationOf<M>>[] = [];


  /**
   * Items are constructed by the `Database` object.
   * @param itemManager
   * @param objectId        Addressable ID.
   * @param _writeStream  Write stream (if not read-only).
   * @param parent        Parent Item (if not a root Item).
   */
  constructor(
    protected readonly _itemManager: ItemManager,
    private readonly _id: ItemID,
    initialState: EchoObject,
    private readonly _writeStream?: FeedWriter<DataMessage>,
    parent?: Item<any> | null
  ) {
    this._initialState = initialState;
    this._updateParent(parent);
  }

  get id(): ItemID {
    return this._id;
  }

  get modelMeta(): ModelMeta | undefined {
    return this._modelMeta ?? undefined;
  }

  get modelType(): string {
    assert(this._modelMeta);
    return this._modelMeta.type;
  }

  get initialized(): boolean {
    return !!this._modelMeta;
  }

  get readOnly() {
    return !this._writeStream || this._deleted;
  }

  get deleted() {
    return this._deleted;
  }

  get parent(): Item<any> | null {
    return this._parent;
  }

  get children(): Item<any>[] {
    return Array.from(this._children.values()).filter((item) => !item.deleted);
  }

  get state(): StateOf<M> {
    assert(this._stateMachine);
    return this._stateMachine.getState();
  }

  toString() {
    return `Item(${JSON.stringify({
      objectId: this.id,
      parentId: this.parent?.id,
      type: this.modelMeta?.type,
    })})`;
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
   * @internal
   * Waits for pending operations to complete.
   */
  async destroy() {
    log('destroy');
    try {
      await Promise.all(this._pendingWrites);
    } catch { }
  }

  /**
   * Delete the item.
   */
  // TODO(burdon): Referential integrity (e.g., delete/hide children?)
  // TODO(burdon): Queries should skip deleted items (unless requested).
  // TODO(burdon): Garbage collection (snapshots should drop deleted items).
  // TODO(burdon): Prevent updates to model if deleted.
  // TODO(burdon): If deconstructed (itemManager.deconstructItem) then how to query?
  async delete() {
    if (!this._writeStream) {
      throw new Error(`Item is read-only: ${this.id}`);
    }
    if (this.deleted) {
      return;
    }

    const onUpdate = this._onUpdate.waitFor(() => this.deleted);
    await this._writeStream.write({
      object: {
        objectId: this.id,
        mutations: [
          {
            action: EchoObject.Mutation.Action.DELETE
          }
        ]
      }
    });

    await onUpdate;
  }

  /**
   * Restore deleted item.
   */
  async restore() {
    if (!this._writeStream) {
      throw new Error(`Item is read-only: ${this.id}`);
    }

    const onUpdate = this._onUpdate.waitFor(() => !this.deleted);
    await this._writeStream.write({
      object: {
        objectId: this.id,
        mutations: [
          {
            action: EchoObject.Mutation.Action.RESTORE
          }
        ]
      }
    });

    await onUpdate;
  }

  // TODO(telackey): This does not allow null or undefined as a parent_id, but should it since we allow a null parent?
  async setParent(parentId: ItemID): Promise<void> {
    if (!this._writeStream || this.readOnly) {
      throw new Error(`Item is read-only: ${this.id}`);
    }

    // Wait for mutation below to be processed.
    // TODO(burdon): Refine to wait for this specific mutation.
    const onUpdate = this._onUpdate.waitFor(() => parentId === this._parent?.id);

    await this._writeStream.write({
      object: {
        objectId: this.id,
        mutations: [
          {
            parentId
          }
        ]
      }
    });

    await onUpdate;
  }

  /**
   * Process a mutation from the stream.
   * @private (Package-private).
   */
  _processMutation(mutation: EchoObject.Mutation, getItem: (objectId: ItemID) => Item<any> | undefined) {
    log('_processMutation %s', { mutation });

    const { action, parentId } = mutation;

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
      const parent = getItem(parentId);
      this._updateParent(parent);
    }

    this._onUpdate.emit(this);
  }

  /**
   * Atomically update parent/child relationship.
   * @param parent
   */
  private _updateParent(parent: Item<any> | null | undefined) {
    log('_updateParent', { parent: parent?.id, prevParent: this._parent?.id });
    if (this._parent) {
      this._parent._children.delete(this);
    }

    if (parent) {
      this._parent = parent;
      this._parent._children.add(this);
    } else {
      this._parent = null;
    }
  }

  private _emitUpdate() {
    this._onUpdate.emit(this);
  }

  processOptimisticMutation(mutation: MutationOf<M>, clientTag?: string) {
    log('process optimistic mutation', { clientTag, mutation });

    const optimisticMutation: MutationInQueue<MutationOf<M>> = {
      mutation: mutation,
      meta: {
        clientTag,
      }
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
      this._stateMachine.process(mutation.mutation);
    }

    // Apply optimistic mutations.
    for (const mutation of this._optimisticMutations) {
      this._stateMachine.process(mutation.mutation);
    }
  }

  /**
   * Processes mutations from the inbound stream.
   */
  processMessage(meta: MutationMetaWithTimeframe, mutation: Any, clientTag?: string) {
    const decoded = this._modelMeta!.mutationCodec.decode(mutation.value);

    // Remove optimistic mutation from the queue.
    const optimisticIndex = this._optimisticMutations.findIndex((message) => message.meta.clientTag && message.meta.clientTag === clientTag);
    if (optimisticIndex !== -1) {
      this._optimisticMutations.splice(optimisticIndex, 1);
    }

    // Insert the mutation into the mutation queue at the right position.
    const insertionIndex = getInsertionIndex(this._mutations, {
      meta,
      mutation
    });
    const lengthBefore = this._mutations.length;
    this._mutations.splice(insertionIndex, 0, { mutation: decoded, meta });
    log('process message', {
      feed: PublicKey.from(meta.feedKey),
      seq: meta.seq,
      clientTag,
      insertionIndex,
      optimisticIndex,
      lengthBefore,
      mutation: this._modelMeta?.mutationCodec.decode(mutation.value)
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
  createSnapshot(): EchoObject {
    if (this.initialized && this.modelMeta!.snapshotCodec && typeof this._stateMachine?.snapshot === 'function') { // If state-machine can create snapshots.
      return {
        objectId: this._id,
        genesis: {
          modelType: this.modelType
        },
        snapshot: {
          ...this._initialState.snapshot,
          model: (this.modelMeta!.snapshotCodec as ProtoCodec).encodeAsAny(this._stateMachine!.snapshot()),
          parentId: this.parent?.id
        },
      }
    } else {
      return {
        objectId: this._id,
        genesis: {
          modelType: this.modelType
        },
        snapshot: {
          ...this._initialState.snapshot,
          parentId: this.parent?.id
        },
        mutations: [
          ...(this._initialState.mutations ?? []),
          ...this._mutations.map((mutation) => ({
            model: mutation.mutation,
            meta: mutation.meta
          }))
        ]
      };
    }

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

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe(listener: (entity: this) => void) {
    return this._onUpdate.on(listener as any);
  }
}
