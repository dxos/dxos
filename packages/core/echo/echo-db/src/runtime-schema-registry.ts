//
// Copyright 2022 DXOS.org
//

import { requireTypeReference, StoredSchema, type AbstractTypedObject } from '@dxos/echo-schema';

const getTypenameOrThrow = (schema: AbstractTypedObject<any>): string => requireTypeReference(schema).itemId;

// TODO(burdon): Reconcile type vs. schema.

/**
 *
 */
export class RuntimeSchemaRegistry {
  private readonly _schemaMap = new Map<string, AbstractTypedObject<any>>();

  constructor() {
    this._schemaMap.set(StoredSchema.typename, StoredSchema);
  }

  get schemas(): AbstractTypedObject<any>[] {
    return Array.from(this._schemaMap.values());
  }

  hasSchema<T>(schema: AbstractTypedObject<T>): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._schemaMap.has(typename);
  }

  getSchema(typename: string): AbstractTypedObject<any> | undefined {
    return this._schemaMap.get(typename);
  }

  // TODO(burdon): Change to array?
  addSchema(...schemaList: AbstractTypedObject<any>[]) {
    schemaList.forEach((schema) => {
      const typename = getTypenameOrThrow(schema);
      if (this._schemaMap.has(typename)) {
        throw new Error(`Schema was already registered: ${typename}`);
      }

      this._schemaMap.set(typename, schema);
    });

    return this;
  }
}
