//
// Copyright 2022 DXOS.org
//

import { type Schema as S } from '@effect/schema';

import { StoredSchema } from './stored-schema';
import { getTypenameOrThrow } from '../types';

/**
 * Runtime registry of static schema objects (i.e., not Dynamic .
 */
// TODO(burdon): Reconcile with EchoSchemaRegistry.
export class RuntimeSchemaRegistry {
  // TODO(burdon): Change to TypedObject
  private readonly _schema = new Map<string, S.Schema<any>>();

  constructor() {
    this._schema.set(StoredSchema.typename, StoredSchema);
  }

  // TODO(burdon): Rename types, hasType, etc.
  get schemas(): S.Schema<any>[] {
    return Array.from(this._schema.values());
  }

  // TODO(burdon): TypedObject
  hasSchema<S extends S.Schema<any>>(schema: S): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._schema.has(typename);
  }

  // TODO(burdon): TypedObject
  getSchema(typename: string): S.Schema<any> | undefined {
    return this._schema.get(typename);
  }

  // TODO(burdon): TypedObject
  addSchema(types: S.Schema<any>[]) {
    types.forEach((schema) => {
      const typename = getTypenameOrThrow(schema);
      if (this._schema.has(typename)) {
        throw new Error(`Schema was already registered: ${typename}`);
      }

      this._schema.set(typename, schema);
    });
  }
}
