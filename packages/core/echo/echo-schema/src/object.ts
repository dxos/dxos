//
// Copyright 2022 DXOS.org
//

import { Item } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Model, ModelConstructor } from '@dxos/model-factory';

import { EchoDatabase } from './database';
import { db, id, unproxy } from './defs';

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
   * @internal
   */
  // TODO(burdon): Remove? Deduce from whether _database is set?
  _isBound = false;

  /** ID accessor. */
  get [id](): string {
    return this[unproxy]._id;
  }

  /** Database reference if bound. */
  get [db](): EchoDatabase | undefined {
    return this[unproxy]._database;
  }

  /** Proxy object. */
  [unproxy]: this = this;

  /**
   * @internal
   */
  abstract _modelConstructor: ModelConstructor<T>;

  constructor() {
    this._id = PublicKey.random().toHex();
  }

  /**
   * Called after object is bound to database.
   */
  protected _onBind(): void {}

  /**
   * @internal
   */
  // TODO(burdon): Document.
  _bind(item: Item<T>, database: EchoDatabase) {
    this._item = item;
    this._database = database;

    this._onBind();
  }
}
