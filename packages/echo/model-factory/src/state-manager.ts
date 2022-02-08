import { FeedWriter, ItemID, MutationMeta } from "@dxos/echo-protocol";
import { ModelConstructor, ModelMeta, MutationOf, MutationWriteReceipt, StateOf } from "./types";
import { Model } from "./model";
import { StateMachine } from "./state-machine";
import { Event } from "@dxos/async";

export class StateManager<M extends Model> {
  private readonly _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown>;

  private readonly _model: M;

  private readonly _messageProcessed = new Event<MutationMeta>();

  constructor(
    private readonly _modelMeta: ModelMeta,
    modelConstructor: ModelConstructor<M>,
    private readonly _itemId: ItemID,
    private readonly _writeStream?: FeedWriter<MutationOf<M>>,
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

  async processMessage(meta: MutationMeta, message: MutationOf<M>): Promise<void> {
    this._stateMachine.process(message, meta);

    this._model.update.emit(this._model);
    
    this._messageProcessed.emit(meta);
  }

  createSnapshot(): any {
    return this._stateMachine.snapshot();
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
    const processed = this._messageProcessed.waitFor(meta =>
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