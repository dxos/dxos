import { FeedWriter, ItemID, ModelSnapshot, MutationMeta } from "@dxos/echo-protocol";
import { ModelConstructor, ModelMessage, ModelMeta, ModelType, MutationOf, MutationWriteReceipt, StateOf } from "./types";
import { Model } from "./model";
import { StateMachine } from "./state-machine";
import { Event } from "@dxos/async";
import assert from "assert";

/**
 * Binds the model to the state machine. Manages the state machine lifecycle.
 */
export class StateManager<M extends Model> {
  private _modelMeta: ModelMeta | null = null;
  
  private _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown> | null = null;

  private _model: M | null = null;

  private readonly _mutationProcessed = new Event<MutationMeta>();

  private _mutations: ModelMessage<Uint8Array>[] = [];

  /**
   * @param _modelType 
   * @param modelConstructor Model's constructor, can be undefined if the registry currently doesn't have this model.
   * @param _itemId 
   * @param _writeStream 
   */
  constructor(
    private readonly _modelType: ModelType,
    modelConstructor: ModelConstructor<M> | undefined,
    private readonly _itemId: ItemID,
    private readonly _writeStream: FeedWriter<Uint8Array> | null,
  ) {
    if(modelConstructor) {
      this._modelMeta = modelConstructor.meta;

      this._stateMachine = this._modelMeta.stateMachine();

      this._model = new modelConstructor(
        this._modelMeta,
        _itemId,
        () => this._stateMachine!.getState(),
        _writeStream ? mutation => this._write(mutation) : undefined,
      );
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

  /**
   * Perform late intitalization.
   * 
   * Only possible if the modelContructor wasn't passed during StateManager's creation.
   */
  initialize(modelConstructor: ModelConstructor<M>) {
    assert(!this._modelMeta, 'Already iniitalized.');

    this._modelMeta = modelConstructor.meta;

    this._stateMachine = this._modelMeta.stateMachine();

    for(const mutation of this._mutations) {
      this._stateMachine.process(this._modelMeta.mutation.decode(mutation.mutation), mutation.meta);
    }

    this._model = new modelConstructor(
      this._modelMeta,
      this._itemId,
      () => this._stateMachine!.getState(),
      this._writeStream ? mutation => this._write(mutation) : undefined,
    );
  }

  /**
   * Process mutation from the inbound stream.
   */
  processMessage(meta: MutationMeta, mutation: Uint8Array) {
    this._mutations.push({ meta, mutation });
    if(this.initialized) {
      const mutationDecoded = this.modelMeta.mutation.decode(mutation);
      this._stateMachine!.process(mutationDecoded, meta);

      this._model!.update.emit(this._model!);
      this._mutationProcessed.emit(meta);
    }
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot(): ModelSnapshot {
    assert(this._modelMeta && this._model && this._stateMachine, 'Model not initialized.');

    if (this.modelMeta.snapshotCodec) {
      return {
        snapshot: this.modelMeta.snapshotCodec.encode(this._stateMachine.snapshot())
      };
    } else {
      return {
        mutations: this._mutations.slice(),
      };
    }
  }

  /**
   * Reset the state to existing snapshot.
   */
  resetToSnapshot(snapshot: ModelSnapshot) {
    assert(this._modelMeta && this._model && this._stateMachine, 'Model not initialized.');

    if(snapshot.snapshot) {
      assert(this._modelMeta.snapshotCodec);
      const decoded = this._modelMeta.snapshotCodec.decode(snapshot.snapshot);
      this._stateMachine.reset(decoded);
    } else {
      this._stateMachine = this._modelMeta.stateMachine();
    }

    this._mutations = [];

    for(const mutation of snapshot.mutations ?? []) {
      const mutationDecoded = this.modelMeta.mutation.decode(mutation.mutation);
      this._mutations.push({
        meta: mutation.meta,
        mutation: mutationDecoded
      });
      this._stateMachine.process(mutationDecoded, mutation.meta);
    }

    this._model.update.emit(this._model);
  }
}