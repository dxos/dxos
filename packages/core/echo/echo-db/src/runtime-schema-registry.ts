//
// Copyright 2022 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { requireTypeReference, StoredEchoSchema } from './ddl';

export class RuntimeSchemaRegistry {
  private readonly _schemaDefinitions = new Map<string, S.Schema<any>>();

  constructor() {
    this._schemaDefinitions.set(StoredEchoSchema.typename, StoredEchoSchema);
  }

  registerSchema(...schemaList: S.Schema<any>[]) {
    schemaList.forEach((schema) => {
      const typename = getTypenameOrThrow(schema);
      if (this._schemaDefinitions.has(typename)) {
        throw new Error(`Schema was already registered or identifier is not unique: ${typename}`);
      }
      this._schemaDefinitions.set(typename, schema);
    });

    return this;
  }

  isSchemaRegistered<T>(schema: S.Schema<T>): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._schemaDefinitions.has(typename);
  }

  getSchema(typename: string): S.Schema<any> | undefined {
    return this._schemaDefinitions.get(typename);
  }
}

const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).itemId;
