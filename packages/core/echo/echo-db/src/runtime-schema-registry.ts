//
// Copyright 2022 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { requireTypeReference, StoredEchoSchema } from '@dxos/echo-schema';

const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).itemId;

export class RuntimeSchemaRegistry {
  private readonly _schemaMap = new Map<string, S.Schema<any>>();

  constructor() {
    this._schemaMap.set(StoredEchoSchema.typename, StoredEchoSchema);
  }

  hasSchema<T>(schema: S.Schema<T>): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._schemaMap.has(typename);
  }

  getSchema(typename: string): S.Schema<any> | undefined {
    return this._schemaMap.get(typename);
  }

  registerSchema(...schemaList: S.Schema<any>[]) {
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
