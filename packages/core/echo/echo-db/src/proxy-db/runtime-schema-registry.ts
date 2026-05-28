//
// Copyright 2022 DXOS.org
//

import type * as Types from 'effect/Types';

import { type CleanupFn, Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { type QueryResult, type SchemaRegistry, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { coerceArray, compositeKey, defaultMap } from '@dxos/util';

import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';

// TODO(wittjosiah): Use Annotation.SystemTypeAnnotation.
const SYSTEM_SCHEMA = ['org.dxos.type.schema'];

/**
 * Registry of `Type.AnyEntity` schemas.
 *
 * Keyed internally by the schema's URI (today always a DXN). Maintains multiple
 * versions per typename for backwards lookup via `getSchemaByDXN`.
 */
export class RuntimeSchemaRegistry implements SchemaRegistry.SchemaRegistry {
  /** Keyed by URI (DXN today, possibly EchoURI in future). */
  private readonly _registry = new Map<URI.URI, Type.AnyEntity>();
  /** Secondary index by typename for `getSchemaByDXN` fallback (no-version lookups). */
  private readonly _byTypename = new Map<string, Type.AnyEntity[]>();
  /** Emitted when schemas are registered. */
  readonly schemaChanges = new Event();

  constructor(schemas: Type.AnyEntity[] = [Type.Type]) {
    schemas.forEach((schema) => this._add(schema));
  }

  get schemas(): Type.AnyEntity[] {
    return Array.from(this._registry.values());
  }

  async register<T extends Type.AnyEntity>(input: T[]): Promise<T[]>;
  async register(input: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.Type[]>;
  async register(input: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.Type[]> {
    // Runtime registry only stores Type entities; the JSON-schema form of
    // `RegisterSchemaInput` is handled by the database-backed registry. Reject
    // anything else explicitly so callers don't silently drop bad input.
    for (const schema of input) {
      if (!Type.isType(schema)) {
        throw new TypeError(
          'RuntimeSchemaRegistry.register expects Type entities (use `Type.makeObject` / `Type.makeRelation`).',
        );
      }
      this._add(schema);
    }
    this.schemaChanges.emit();

    // TODO(wittjosiah): This registry only support static schemas.
    return [];
  }

  private _add(schema: Type.AnyEntity): void {
    const uri = Type.getURI(schema) ?? raise(new TypeError('Schema has no URI'));
    if (this._registry.has(uri)) {
      const typename = Type.getTypename(schema);
      const version = Type.getVersion(schema);
      throw new Error(`Schema version already registered: ${typename}:${version}`);
    }
    this._registry.set(uri, schema);

    const typename = Type.getTypename(schema) ?? raise(new TypeError('Schema has no typename'));
    invariant(typename, 'Not a valid ECHO schema');
    const versions = defaultMap(this._byTypename, typename, () => [] as Type.AnyEntity[]);
    versions.push(schema);
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
  hasSchema(schema: Type.AnyEntity): boolean {
    const uri = Type.getURI(schema);
    if (!uri) {
      return false;
    }
    return this._registry.has(uri);
  }

  // TODO(wittjosiah): Not a part of SchemaRegistry interface, remove?
  getSchemaByDXN(dxn: DXN.DXN): Type.AnyEntity | undefined {
    // If the DXN has a version, look up directly by URI.
    if (DXN.getVersion(dxn)) {
      return this._registry.get(dxn);
    }
    // No version specified — return the earliest known version for backwards compatibility.
    const type = DXN.getName(dxn);
    const allSchemas = this._byTypename.get(type) ?? [];
    // TODO(dmaretskyi): Probably not correct to compare lexicographically, but it's good enough for now.
    return allSchemas.sort((a, b) => (Type.getVersion(a) ?? '0.0.0').localeCompare(Type.getVersion(b) ?? '0.0.0'))[0];
  }

  /**
   * @deprecated Use getSchemaByDXN.
   */
  // TODO(wittjosiah): Remove.
  getSchema(typename: string): Type.AnyEntity | undefined {
    return this._byTypename.get(typename)?.[0];
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
