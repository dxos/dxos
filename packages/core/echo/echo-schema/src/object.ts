//
// Copyright 2022 DXOS.org
//

import { createModelMutation, encodeModelMutation, Item } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Model, ModelConstructor, MutationWriteReceipt } from '@dxos/model-factory';

import { EchoDatabase } from './database';
import { base, db, id } from './defs';

/**
 * Base class for all echo objects.
 * Can carry different models.
 */
export abstract class EchoObject<T extends Model = any> {
  /**
   * @internal
   */
  _id = PublicKey.random().toHex();

  /**
   * Not present for freshly created objects.
   * @internal
   */
  _database?: EchoDatabase;

  /**
   * Not present for freshly created objects.
   * @internal
   */
  _item?: Item<T>;

  /**
   * Not present for freshly created objects.
   * Created locally when object is bound to database.
   * @internal
   */
  _model?: T;

  /**
   * @internal
   */
  abstract _modelConstructor: ModelConstructor<T>;

  constructor() {
    this._id = PublicKey.random().toHex();
  }

  /** Proxied object. */
  [base]: this = this;

  /** ID accessor. */
  // TODO(burdon): Expose as property?
  get [id](): string {
    return this[base]._id;
  }

  /** Database reference if bound. */
  get [db](): EchoDatabase | undefined {
    return this[base]._database;
  }

  /**
   * Called after object is bound to database.
   */
  protected async _onBind(): Promise<void> {}

  /**
   * @internal
   */
  // TODO(burdon): Document.
  async _bind(item: Item<T>) {
    this._item = item;
    this._model = new this._modelConstructor(
      this._modelConstructor.meta,
      this._id,
      () => this._getState(),
      async (mutation): Promise<MutationWriteReceipt> => {
        const result = this._database!._backend.mutate(
          createModelMutation(this._id, encodeModelMutation(this._model!.modelMeta, mutation))
        );

        return result.getReceipt();
      }
    );

    await this._onBind();
  }

  protected _getState(): any | undefined {
    // TODO(dmaretskyi): Local state-machine for unbound objects.
    return this._item?._stateManager.state;
  }
}
