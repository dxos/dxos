//
// Copyright 2022 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { defaultMap } from '@dxos/util';

import { getSchemaTypename, getSchemaVersion } from '../ast';
import { StoredSchema } from '../types';

/**
 * Runtime registry of static schema objects (i.e., not Dynamic .
 */
// TODO(burdon): Reconcile with EchoSchemaRegistry.
export class RuntimeSchemaRegistry {
  private readonly _registry = new Map<string, Schema.Schema.AnyNoContext[]>();

  constructor() {
    this._registry.set(StoredSchema.typename, [StoredSchema]);
  }

  get schemas(): Schema.Schema.AnyNoContext[] {
    return Array.from(this._registry.values()).flat();
  }

  hasSchema<S extends Schema.Schema.AnyNoContext>(schema: S): boolean {
    const typename = getSchemaTypename(schema);
    const version = getSchemaVersion(schema);
    invariant(typename, 'Invalid schema');

    const schemas = this._registry.get(typename);
    return schemas?.some((schema) => getSchemaVersion(schema) === version) ?? false;
  }

  getSchemaByDXN(dxn: DXN): Schema.Schema.AnyNoContext | undefined {
    const components = dxn.asTypeDXN();
    if (!components) {
      return undefined;
    }

    const { type, version } = components;
    const allSchemas = this._registry.get(type) ?? [];
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
  getSchema(typename: string): Schema.Schema.AnyNoContext | undefined {
    return this._registry.get(typename)?.[0];
  }

  addSchema(types: Schema.Schema.AnyNoContext[]): void {
    types.forEach((schema) => {
      const typename = getSchemaTypename(schema) ?? raise(new TypeError('Schema has no typename'));
      const version = getSchemaVersion(schema) ?? raise(new TypeError('Schema has no version'));
      const versions = defaultMap(this._registry, typename, () => []);
      if (versions.some((schema) => getSchemaVersion(schema) === version)) {
        throw new Error(`Schema version already registered: ${typename}:${version}`);
      }

      versions.push(schema);
    });
  }
}
