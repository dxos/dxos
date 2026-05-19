//
// Copyright 2022 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { type CleanupFn, Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { type QueryResult, Registry, type SchemaRegistry, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { coerceArray, compositeKey } from '@dxos/util';

import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';

// TODO(wittjosiah): Use Annotation.SystemTypeAnnotation.
const SYSTEM_SCHEMA = ['org.dxos.type.schema'];

/**
 * Registry of `Type.RuntimeType` schemas.
 *
 * Delegates type storage to a {@link Registry.Registry} instance.
 * Accepts an existing registry (e.g. `hypergraph.registry`) or creates its own.
 */
export class RuntimeSchemaRegistry implements SchemaRegistry.SchemaRegistry {
  private readonly _backingRegistry: Registry.Registry;
  /** Emitted when schemas are registered. */
  readonly schemaChanges = new Event();

  constructor(schemasOrRegistry?: Type.AnyEntity[] | Registry.Registry) {
    if (schemasOrRegistry !== undefined && !Array.isArray(schemasOrRegistry)) {
      // Externally-provided Registry — share its storage.
      this._backingRegistry = schemasOrRegistry;
    } else {
      // Create an internal Registry seeded with the provided schemas.
      const schemas = (schemasOrRegistry as Type.AnyEntity[] | undefined) ?? [Type.PersistentType];
      this._backingRegistry = Registry.make();
      if (schemas.length > 0) {
        this._backingRegistry.addTypes(schemas);
      }
    }
    // Forward changes from the backing registry to schemaChanges.
    this._backingRegistry.changed.on(() => this.schemaChanges.emit());
  }

  get schemas(): Type.AnyEntity[] {
    return [...this._backingRegistry.types];
  }

  async register(input: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.RuntimeType[]> {
    const toAdd = input
      // TODO(wittjosiah): This should filter out or throw on non-ECHO schemas.
      .filter((schema): schema is Type.AnyEntity => Schema.isSchema(schema));

    for (const schema of toAdd) {
      const typename = Type.getTypename(schema) ?? raise(new TypeError('Schema has no typename'));
      const version = Type.getVersion(schema) ?? raise(new TypeError('Schema has no version'));
      const dxnStr = `dxn:type:${typename}:${version}`;
      if (this._backingRegistry.getTypeByDXN(dxnStr) !== undefined) {
        throw new Error(`Schema version already registered: ${typename}:${version}`);
      }
    }

    this._backingRegistry.addTypes(toAdd);
    // schemaChanges fires via the _backingRegistry.changed subscription above.

    // TODO(wittjosiah): This registry only support static schemas.
    return [];
  }

  query<Q extends Types.NoExcessProperties<SchemaRegistry.Query, Q>>(
    query?: Q & SchemaRegistry.Query,
  ): QueryResult.QueryResult<Type.Type> {
    const self = this;
    const changes = new Event();
    let unsubscribe: CleanupFn | undefined;
    return new SchemaRegistryPreparedQueryImpl<Type.Type>({
      changes,
      getResultsSync() {
        return filterOrderResults(self.schemas, query ?? {}) as Type.Type[];
      },
      async getResults() {
        return filterOrderResults(self.schemas, query ?? {}) as Type.Type[];
      },
      async start() {
        if (unsubscribe) {
          return;
        }
        unsubscribe = self.schemaChanges.on(() => {
          changes.emit();
        });
      },
      async stop() {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    });
  }

  // TODO(wittjosiah): Not a part of SchemaRegistry interface, remove?
  hasSchema<S extends Type.AnyEntity>(schema: S): boolean {
    const typename = Type.getTypename(schema);
    const version = Type.getVersion(schema);
    invariant(typename, 'Invalid schema');
    return this._backingRegistry.getTypeByDXN(`dxn:type:${typename}:${version}`) !== undefined;
  }

  // TODO(wittjosiah): Not a part of SchemaRegistry interface, remove?
  getSchemaByDXN(dxn: DXN): Type.AnyEntity | undefined {
    const components = dxn.asTypeDXN();
    if (!components) {
      return undefined;
    }

    const { type, version } = components;
    if (version) {
      return this._backingRegistry.getTypeByDXN(`dxn:type:${type}:${version}`);
    } else {
      // If no version is specified, return the earliest version for backwards compatibility.
      // TODO(dmaretskyi): Probably not correct to compare lexicographically, but it's good enough for now.
      return this._backingRegistry.types
        .filter((s) => Type.getTypename(s) === type)
        .sort((a, b) => (Type.getVersion(a) ?? '0.0.0').localeCompare(Type.getVersion(b) ?? '0.0.0'))[0];
    }
  }

  /**
   * @deprecated Use getSchemaByDXN.
   */
  // TODO(wittjosiah): Remove.
  getSchema(typename: string): Type.AnyEntity | undefined {
    return this._backingRegistry.types.find((s) => Type.getTypename(s) === typename);
  }
}

const getSortKey = (schema: Type.AnyEntity) =>
  compositeKey(Type.getTypename(schema), Type.getVersion(schema), String(Type.getURI(schema)));

const filterOrderResults = (schemas: Type.AnyEntity[], query: SchemaRegistry.Query) => {
  const filtered = schemas
    .filter((schema) => {
      const typename = Type.getTypename(schema);

      if (!query.includeSystem && SYSTEM_SCHEMA.includes(typename)) {
        return false;
      }

      const typenameFilter = coerceArray(query.typename);
      if (typenameFilter.length > 0) {
        if (!typenameFilter.includes(typename)) {
          return false;
        }
      }

      if (query.version) {
        if (!query.version.match(/^[0-9.]+$/)) {
          throw new Error('Semver version ranges not supported.');
        }

        const version = Type.getVersion(schema);
        if (version !== query.version) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
  log('filtered schemas', {
    query,
    schemas: schemas.map((s) => Type.getTypename(s)),
    filtered: filtered.map((s) => Type.getTypename(s)),
  });
  return filtered;
};
