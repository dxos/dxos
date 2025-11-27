//
// Copyright 2022 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { type DXN, type QueryResult, type SchemaRegistry, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { coerceArray, defaultMap } from '@dxos/util';

import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';

// TODO(wittjosiah): Use Annotation.SystemTypeAnnotation.
const SYSTEM_SCHEMA = ['dxos.org/type/Schema'];

/**
 * Registry of `Type.RuntimeType` schemas.
 */
export class RuntimeSchemaRegistry implements SchemaRegistry.SchemaRegistry {
  private readonly _registry = new Map<string, Type.Entity.Any[]>();

  constructor(schemas: Type.Entity.Any[] = [Type.PersistentType]) {
    schemas.forEach((schema) => {
      const typename = Type.getTypename(schema);
      invariant(typename, 'Not a valid ECHO schema');
      this._registry.set(typename, [schema]);
    });
  }

  get schemas(): Type.Entity.Any[] {
    return Array.from(this._registry.values()).flat();
  }

  async register(input: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.RuntimeType[]> {
    input
      // TODO(wittjosiah): This should filter out or throw on non-ECHO schemas.
      .filter((schema): schema is Type.Entity.Any => Schema.isSchema(schema))
      .forEach((schema) => {
        const typename = Type.getTypename(schema) ?? raise(new TypeError('Schema has no typename'));
        const version = Type.getVersion(schema) ?? raise(new TypeError('Schema has no version'));
        const versions = defaultMap(this._registry, typename, () => []);
        if (versions.some((schema) => Type.getVersion(schema) === version)) {
          throw new Error(`Schema version already registered: ${typename}:${version}`);
        }

        versions.push(schema);
      });

    // TODO(wittjosiah): This registry only support static schemas.
    return [];
  }

  // TODO(wittjosiah): This is not currently reactive to newly registered schemas.
  //   Implement once interface is simplified.
  query<Q extends Types.NoExcessProperties<SchemaRegistry.Query, Q>>(
    query?: Q & SchemaRegistry.Query,
  ): QueryResult.QueryResult<SchemaRegistry.ExtractQueryResult<Q>> {
    const self = this;
    const changes = new Event();
    return new SchemaRegistryPreparedQueryImpl<SchemaRegistry.ExtractQueryResult<Q>>({
      changes,
      getResultsSync() {
        return filterOrderResults(self.schemas, query ?? {}) as SchemaRegistry.ExtractQueryResult<Q>[];
      },
      async getResults() {
        return filterOrderResults(self.schemas, query ?? {}) as SchemaRegistry.ExtractQueryResult<Q>[];
      },
      async start() {},
      async stop() {},
    });
  }

  // TODO(wittjosiah): Not a part of SchemaRegistry interface, remove?
  hasSchema<S extends Type.Entity.Any>(schema: S): boolean {
    const typename = Type.getTypename(schema);
    const version = Type.getVersion(schema);
    invariant(typename, 'Invalid schema');

    const schemas = this._registry.get(typename);
    return schemas?.some((schema) => Type.getVersion(schema) === version) ?? false;
  }

  // TODO(wittjosiah): Not a part of SchemaRegistry interface, remove?
  getSchemaByDXN(dxn: DXN): Type.Entity.Any | undefined {
    const components = dxn.asTypeDXN();
    if (!components) {
      return undefined;
    }

    const { type, version } = components;
    const allSchemas = this._registry.get(type) ?? [];
    if (version) {
      return allSchemas.find((s) => Type.getVersion(s) === version);
    } else {
      // If no version is specified, return the earliest version for backwards compatibility.
      // TODO(dmaretskyi): Probably not correct to compare lexicographically, but it's good enough for now.
      return allSchemas.sort((a, b) => (Type.getVersion(a) ?? '0.0.0').localeCompare(Type.getVersion(b) ?? '0.0.0'))[0];
    }
  }
  /**
   * @deprecated Use getSchemaByDXN.
   */
  // TODO(wittjosiah): Remove.
  getSchema(typename: string): Schema.Schema.AnyNoContext | undefined {
    return this._registry.get(typename)?.[0];
  }
}

const getSortKey = (schema: Type.Entity.Any) =>
  Type.getTypename(schema) + ':' + Type.getVersion(schema) + ':' + Type.getDXN(schema);

const filterOrderResults = (schemas: Type.Entity.Any[], query: SchemaRegistry.Query) => {
  log('Filtering schemas', { schemas, query });
  return schemas
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
};
