import { FeedWriter, ItemID, ModelSnapshot, MutationMeta } from "@dxos/echo-protocol";
import { ModelConstructor, ModelMessage, ModelMeta, MutationOf, MutationWriteReceipt, StateOf } from "./types";
import { Model } from "./model";
import { StateMachine } from "./state-machine";
import { Event } from "@dxos/async";
import assert from "assert";

export class StateManager<M extends Model> {
  private readonly _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown>;

  private readonly _model: M;

  private readonly _mutationProcessed = new Event<MutationMeta>();

  private _mutations: ModelMessage<MutationOf<M>>[] = [];

  constructor(
    private readonly _modelMeta: ModelMeta,
    modelConstructor: ModelConstructor<M>,
    private readonly _itemId: ItemID,
    private readonly _writeStream: FeedWriter<Uint8Array> | null,
  ) {
    this._stateMachine = _modelMeta.stateMachine();

    this._model = new modelConstructor(
      this._modelMeta,
      _itemId,
      () => this._stateMachine.getState(),
      _writeStream ? mutation => this.write(mutation) : undefined,
    );
  }

  get modelMeta(): ModelMeta {
    return this._modelMeta;
  }

  get stateMachine(): StateMachine<StateOf<M>, MutationOf<Model>, unknown> {
    return this._stateMachine;
  }

  get model() {
    return this._model;
  }

  async processMessage(meta: MutationMeta, mutationEncoded: Uint8Array): Promise<void> {
    const mutation = this.modelMeta.mutation.decode(mutationEncoded);

    this._mutations.push({ meta, mutation });

    this._stateMachine.process(mutation, meta);

    this._model.update.emit(this._model);
    
    this._mutationProcessed.emit(meta);
  }

  createSnapshot(): ModelSnapshot {
    if (this.modelMeta.snapshotCodec) {
      return {
        custom: this.modelMeta.snapshotCodec.encode(this._stateMachine.snapshot())
      };
    } else {
      return {
        array: {
          mutations: this._mutations.map(message => ({
            mutation: this.modelMeta.mutation.encode(message.mutation),
            meta: message.meta,
          }))
        }
      };
    }
  }

  async restoreFromSnapshot(snapshot: ModelSnapshot): Promise<void> {
    if(snapshot.custom) {
      assert(this._modelMeta.snapshotCodec);
      const decoded = this._modelMeta.snapshotCodec.decode(snapshot.custom);
      this._stateMachine.reset(decoded);

      this._mutations = [];
    } else if(snapshot.array) {
      this._mutations = [];

      for(const mutation of snapshot.array.mutations ?? []) {
        const mutationDecoded = this.modelMeta.mutation.decode(mutation.mutation);
        this._mutations.push({
          meta: mutation.meta,
          mutation: mutationDecoded
        });
        this._stateMachine.process(mutationDecoded, mutation.meta);
      }
    } else {
      throw new Error('Invalid snapshot');
    }

    this._model.update.emit(this._model);
  }

  /**
   * Writes the raw mutation to the output stream.
   */
  protected async write(mutation: MutationOf<M>): Promise<MutationWriteReceipt> {
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
}