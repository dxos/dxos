import { FeedWriter, ItemID, MutationMeta } from "@dxos/echo-protocol";
import { ModelConstructor, ModelMeta, MutationOf, StateOf } from "./types";
import { Model } from "./model";
import { StateMachine } from "./state-machine";

export class StateManager<M extends Model> {
  private readonly _stateMachine: StateMachine<StateOf<M>, MutationOf<Model>, unknown>;

  private readonly _model: M;

  constructor(
    private readonly _modelMeta: ModelMeta,
    modelConstructor: ModelConstructor<M>,
    itemId: ItemID,
    writeStream?: FeedWriter<MutationOf<M>>,
  ) {
    this._stateMachine = _modelMeta.stateMachine();

    this._model = new modelConstructor(
      this._modelMeta,
      itemId,
      () => this._stateMachine.getState(),
      writeStream,
    );
  }

  get modelMeta(): ModelMeta {
    return this._modelMeta;
  }

  get stateMachine(): StateMachine<StateOf<M>, MutationOf<Model>, unknown>{
    return this._stateMachine;
  }

  get model() {
    return this._model;
  }

  async processMessage (meta: MutationMeta, message: MutationOf<M>): Promise<void> {
    this._stateMachine.process(message, meta);

    this._model.update.emit(this._model);

    this._model._messageProcessed.emit(meta);
  }

  createSnapshot (): any {
    return this._stateMachine.snapshot();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async restoreFromSnapshot (snapshot: any): Promise<void> {
    this._stateMachine.reset(snapshot);
  }
}