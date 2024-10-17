//
// Copyright 2022 DXOS.org
//

import { type Schema as S } from '@effect/schema';

import { StoredSchema } from './stored-schema';
import { requireTypeReference } from '../proxy';

// TODO(burdon): Make async.
export type SchemaResolver = (type: string) => S.Schema<any> | undefined;

// TODO(burdon): Typename?
const getTypenameOrThrow = (schema: S.Schema.All): string => requireTypeReference(schema).objectId;

/**
 * Runtime registry of schema objects.
 */
export class RuntimeSchemaRegistry {
  private readonly _schema = new Map<string, S.Schema<any>>();

  constructor() {
    this._schema.set(StoredSchema.typename, StoredSchema);
  }

  get schemas(): S.Schema<any>[] {
    return Array.from(this._schema.values());
  }

  hasSchema<S extends S.Schema.All>(schema: S): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._schema.has(typename);
  }

  getSchema(typename: string): S.Schema<any> | undefined {
    return this._schema.get(typename);
  }

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
