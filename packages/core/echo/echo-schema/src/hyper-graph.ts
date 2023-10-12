//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { EchoDatabase } from './database';
import { TypeCollection } from './type-collection';

/**
 * Manages cross-space database interactions.
 */
export class HyperGraph {
  private readonly _databases = new ComplexMap<PublicKey, EchoDatabase>(PublicKey.hash);

  private readonly _types = new TypeCollection();

  get types(): TypeCollection {
    return this._types;
  }

  addTypes(schema: TypeCollection) {
    this._types.mergeSchema(schema);
    return this;
  }

  /**
   * @internal
   */
  _register(spaceKey: PublicKey, database: EchoDatabase) {
    this._databases.set(spaceKey, database);
  }
}
