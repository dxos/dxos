//
// Copyright 2022 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { requireTypeReference, StoredSchema } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { invariant } from '@dxos/invariant';

const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).itemId;

// TODO(burdon): Reconcile type vs. schema.

/**
 *
 */
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

  getSchemaByDxn(dxn: DXN): S.Schema<any> | undefined {
    invariant(dxn.kind === DXN.kind.TYPE);

    const typename = dxn.parts[0];
    return this.getSchema(typename);
  }

  // TODO(burdon): Change to array.
  addSchema(...schemaList: S.Schema<any>[]) {
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
