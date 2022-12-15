import { Context } from "@dxos/context";
import { Database, DataPipelineControllerImpl, ISpace, Space } from "@dxos/echo-db";
import { PublicKey } from "@dxos/keys";
import { ModelFactory } from "@dxos/model-factory";
import assert from "node:assert";

export class DataSpace implements ISpace {
  private readonly _ctx = new Context();
  private readonly _dataPipelineController: DataPipelineControllerImpl;

  constructor(
    private readonly _inner: Space,
    private readonly _modelFactory: ModelFactory,
    private readonly _memberKey: PublicKey,
  ) { 
    this._dataPipelineController = new DataPipelineControllerImpl(
      _modelFactory,
      _memberKey,
      (feedKey) => _inner.spaceState.feeds.get(feedKey)
    )
  }

  get key() {
    return this._inner.key;
  }

  get inner() {
    return this._inner;
  }

  get isOpen() {
    return this._inner.isOpen;
  }

  get dataPipelineController(): DataPipelineControllerImpl {
    return this._dataPipelineController;
  }

  get database(): Database {
    assert(this._dataPipelineController.database);
    return this._dataPipelineController.database;
  }

  get stateUpdate() {
    return this._inner.stateUpdate;
  }

  async open() {
    await this._inner.open();
  }

  async close() {
    await this._ctx.dispose();
    await this._inner.close();
  }

}