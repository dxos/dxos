//
// Copyright 2022 DXOS.org
//

import { type Schema as S } from '@effect/schema';

import { raise } from '@dxos/debug';
import type { DXN } from '@dxos/keys';
import { defaultMap } from '@dxos/util';

import { StoredSchema } from './stored-schema';
import { getSchemaVersion, getTypenameOrThrow } from '../types';

/**
 * Runtime registry of static schema objects (i.e., not Dynamic .
 */
// TODO(burdon): Reconcile with EchoSchemaRegistry.
export class RuntimeSchemaRegistry {
  // TODO(burdon): Change to TypedObject
  private readonly _schema = new Map<string, S.Schema<any>[]>();

  constructor() {
    this._schema.set(StoredSchema.typename, [StoredSchema]);
  }

  // TODO(burdon): Rename types, hasType, etc.
  get schemas(): S.Schema<any>[] {
    return Array.from(this._schema.values()).flat();
  }

  // TODO(burdon): TypedObject
  hasSchema<S extends S.Schema<any>>(schema: S): boolean {
    const typename = getTypenameOrThrow(schema);
    const arr = this._schema.get(typename);
    return arr?.some((s) => getSchemaVersion(s) === getSchemaVersion(schema)) ?? false;
  }

  getSchemaByDXN(dxn: DXN): S.Schema<any> | undefined {
    const components = dxn.asTypeDXN();
    if (!components) {
      return undefined;
    }
    const { type, version } = components;
    const allSchemas = this._schema.get(type) ?? [];
    if (version) {
      return allSchemas.find((s) => getSchemaVersion(s) === version);
    } else {
      // If no version is specified, return the earliest version for backwards compatibility.
      // TODO(dmaretskyi): Probably not correct to compare lexicographically, but it's good enough for now.
      return allSchemas.sort((a, b) =>
        (getSchemaVersion(a) ?? '0.0.0').localeCompare(getSchemaVersion(b) ?? '0.0.0'),
      )[0];
    }
  }

  /**
   * @deprecated Use getSchemaByDXN.
   */
  // TODO(burdon): TypedObject
  getSchema(typename: string): S.Schema<any> | undefined {
    return this._schema.get(typename)?.[0];
  }

  // TODO(burdon): TypedObject
  addSchema(types: S.Schema<any>[]) {
    types.forEach((schema) => {
      const typename = getTypenameOrThrow(schema);
      const version = getSchemaVersion(schema) ?? raise(new TypeError('Schema has no version.'));
      const arr = defaultMap(this._schema, typename, () => []);
      if (arr.some((s) => getSchemaVersion(s) === version)) {
        throw new Error(`Schema version already registered: ${typename}:${version}`);
      }

      arr.push(schema);
    });
  }
}
