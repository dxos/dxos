//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Item } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { EchoDatabase } from './database';
import { EchoSchema } from './schema';

/**
 * Manages cross-space databases.
 * Tracks observable mutations on objects.
 * @deprecated
 */
// TODO(burdon): Review.
export class DatabaseRouter {
  private readonly _databases = new ComplexMap<PublicKey, EchoDatabase>(PublicKey.hash);
  private readonly _update = new Event<{ spaceKey: PublicKey; changedEntities: Item<any>[] }>();

  private readonly _schema = EchoSchema.fromJson('{}');

  get schema(): EchoSchema | undefined {
    return this._schema;
  }

  addSchema(schema: EchoSchema) {
    this._schema.mergeSchema(schema);
  }

  register(spaceKey: PublicKey, database: EchoDatabase) {
    this._databases.set(spaceKey, database);
    database._updateEvent.on((entities) => this._update.emit({ spaceKey, changedEntities: entities }));
  }
}
