import { FeedWriter, ItemID, ModelSnapshot, MutationMeta } from "@dxos/echo-protocol";
import { ModelConstructor, ModelMessage, ModelMeta, MutationOf, MutationWriteReceipt, StateOf } from "./types";
import { Model } from "./model";
import { StateMachine } from "./state-machine";
import { Event } from "@dxos/async";

export class StateManager<M extends Model> {
  private readonly _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown>;

  private readonly _model: M;

  private readonly _mutationProcessed = new Event<MutationMeta>();

  private _mutations: ModelMessage<MutationOf<M>>[] = [];

  constructor(
    private readonly _modelMeta: ModelMeta,
    modelConstructor: ModelConstructor<M>,
    private readonly _itemId: ItemID,
    private readonly _writeStream: FeedWriter<MutationOf<M>> | null,
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

  async processMessage(meta: MutationMeta, mutation: MutationOf<M>): Promise<void> {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async restoreFromSnapshot(snapshot: any): Promise<void> {
    this._stateMachine.reset(snapshot);
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

    const receipt = await this._writeStream.write(mutation);
    return {
      ...receipt,
      waitToBeProcessed: async () => {
        await processed;
      }
    };
  }
}