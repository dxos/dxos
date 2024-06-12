//
// Copyright 2022 DXOS.org
//

import { type S, StoredSchema, requireTypeReference } from '@dxos/echo-schema';

const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).itemId;

/**
 *
 */
// TODO(burdon): Reconcile type vs. schema.
// TODO(burdon): Tighten S.Schema to AbstractTypedObject
export class RuntimeSchemaRegistry {
  private readonly _schemaMap = new Map<string, S.Schema<any>>();

  constructor() {
    this._schemaMap.set(StoredSchema.typename, StoredSchema);
  }

  get schemas(): S.Schema<any>[] {
    return Array.from(this._schemaMap.values());
  }

  hasSchema<T>(schema: S.Schema<T>): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._schemaMap.has(typename);
  }

  getSchema(typename: string): S.Schema<any> | undefined {
    return this._schemaMap.get(typename);
  }

  addSchema(types: S.Schema<any>[]) {
    types.forEach((schema) => {
      const typename = getTypenameOrThrow(schema);
      if (this._schemaMap.has(typename)) {
        throw new Error(`Schema was already registered: ${typename}`);
      }

      this._schemaMap.set(typename, schema);
    });

    return this;
  }
}
