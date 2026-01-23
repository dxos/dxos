//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { type CleanupFn, Event } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { JsonSchema, type QueryResult, type SchemaRegistry, Type } from '@dxos/echo';
import {
  PersistentSchema,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  createObject,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
  makeTypeJsonSchemaAnnotation,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, type ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { coerceArray } from '@dxos/util';

import { getObjectCore } from '../echo-handler';
import { Filter } from '../query';

import { type EchoDatabase } from './database';
import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';

// TODO(wittjosiah): Use Annotation.SystemTypeAnnotation.
const SYSTEM_SCHEMA = ['dxos.org/type/Schema'];

type SchemaSubscriptionCallback = (schema: Type.RuntimeType[]) => void;

export type DatabaseSchemaRegistryOptions = {
  /**
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveQuery?: boolean;

  /**
   * Preload all schema during open.
   * @default true
   */
  preloadSchemaOnOpen?: boolean;
};

/**
 * Registry of `PersistentSchema` mutable schema objects within a space.
 */
export class DatabaseSchemaRegistry extends Resource implements SchemaRegistry.SchemaRegistry {
  private readonly _schemaById: Map<string, Type.RuntimeType> = new Map();
  private readonly _schemaByType: Map<string, Type.RuntimeType> = new Map();
  private readonly _unsubscribeById: Map<string, CleanupFn> = new Map();
  private readonly _schemaSubscriptionCallbacks: SchemaSubscriptionCallback[] = [];

  private readonly _reactiveQuery: boolean;
  private readonly _preloadSchemaOnOpen: boolean;

  constructor(
    private readonly _db: EchoDatabase,
    { reactiveQuery = true, preloadSchemaOnOpen = true }: DatabaseSchemaRegistryOptions = {},
  ) {
    super();
    this._reactiveQuery = reactiveQuery;
    this._preloadSchemaOnOpen = preloadSchemaOnOpen;
  }

  protected override async _open(_ctx: Context): Promise<void> {
    // Preloading schema is required for ECHO to operate.
    // TODO(dmaretskyi): Does this change with strong object deps.
    if (this._preloadSchemaOnOpen) {
      const objects = await this._db.query(Filter.type(PersistentSchema)).run();

      objects.forEach((object) => this._registerSchema(object));
    }

    if (this._reactiveQuery) {
      const unsubscribe = this._db.query(Filter.type(PersistentSchema)).subscribe((query) => {
        const objects = query.results;
        const currentObjectIds = new Set(objects.map((o) => o.id));
        const newObjects = objects.filter((object) => !this._schemaById.has(object.id));
        const removedObjects = [...this._schemaById.keys()].filter((oid) => !currentObjectIds.has(oid));
        newObjects.forEach((obj) => this._register(obj));
        removedObjects.forEach((idoid) => this._unregister(idoid));
        if (newObjects.length > 0 || removedObjects.length > 0) {
          this._notifySchemaListChanged();
        }
      });
      this._ctx.onDispose(unsubscribe);
    }
  }

  protected override async _close(_ctx: Context): Promise<void> {
    // Nothing to do.
  }

  public hasSchema(schema: Type.Entity.Any): boolean {
    const schemaId = schema instanceof Type.RuntimeType ? schema.id : getObjectIdFromSchema(schema);
    return schemaId != null && this.getSchemaById(schemaId) != null;
  }

  // TODO(burdon): Refactor: this is too complex and untestable.
  query<Q extends Types.NoExcessProperties<SchemaRegistry.Query, Q>>(
    _query?: Q & SchemaRegistry.Query,
  ): QueryResult.QueryResult<SchemaRegistry.ExtractQueryResult<Q>> {
    const self = this;
    const query: SchemaRegistry.Query = _query ?? {};
    const allowedLocations = query.location ?? ['database'];

    type Entry =
      | {
          source: 'runtime';
          schema: Schema.Schema.AnyNoContext;
        }
      | {
          source: 'database';
          schema: Type.RuntimeType;
        };

    const getSortKey = (entry: Entry) =>
      Type.getTypename(entry.schema) + ':' + Type.getVersion(entry.schema) + ':' + Type.getDXN(entry.schema);

    const filterOrderResults = (schemas: Entry[]) => {
      log('Filtering schemas', { schemas, query });
      return schemas
        .filter((object) => {
          if (!allowedLocations.includes(object.source)) {
            return false;
          }

          switch (object.source) {
            case 'runtime': {
              const typename = Type.getTypename(object.schema);

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

                const version = Type.getVersion(object.schema);
                if (version !== query.version) {
                  return false;
                }
              }

              return true;
            }
            case 'database': {
              if (!validateStoredSchemaIntegrity(object.schema.persistentSchema)) {
                return false;
              }

              const idFilter = coerceArray(query.id);
              if (idFilter.length > 0) {
                if (object.schema.jsonSchema.$id && !idFilter.includes(object.schema.jsonSchema.$id)) {
                  return false;
                }
              }

              const backingObjectIdFilter = coerceArray(query.backingObjectId);
              if (backingObjectIdFilter.length > 0) {
                if (!backingObjectIdFilter.includes(object.schema.id)) {
                  return false;
                }
              }

              const typenameFilter = coerceArray(query.typename);
              if (typenameFilter.length > 0) {
                if (!typenameFilter.includes(object.schema.typename)) {
                  return false;
                }
              }

              if (query.version) {
                if (!query.version.match(/^[0-9.]+$/)) {
                  throw new Error('Semver version ranges not supported.');
                }

                if (object.schema.version !== query.version) {
                  return false;
                }
              }
              return true;
            }
            default: {
              return false;
            }
          }
        })
        .sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)))
        .map((entry) => entry.schema);
    };

    const changes = new Event();
    let unsubscribe: CleanupFn | undefined;
    return new SchemaRegistryPreparedQueryImpl({
      changes,
      getResultsSync() {
        const objects = self._db.query(Filter.type(PersistentSchema)).runSync();

        const results = filterOrderResults([
          ...self._db.graph.schemaRegistry.schemas.map((schema) => {
            return {
              source: 'runtime',
              schema,
            } as const;
          }),
          ...objects.map((stored) => {
            return {
              source: 'database',
              schema: self._register(stored),
            } as const;
          }),
        ]);
        return results;
      },
      async getResults() {
        const objects = await self._db.query(Filter.type(PersistentSchema)).run();

        return filterOrderResults([
          ...self._db.graph.schemaRegistry.schemas.map((schema) => {
            return {
              source: 'runtime',
              schema,
            } as const;
          }),
          ...objects.map((stored) => {
            return {
              source: 'database',
              schema: self._register(stored),
            } as const;
          }),
        ]);
      },
      async start() {
        if (unsubscribe) {
          return;
        }
        unsubscribe = self._subscribe(() => {
          changes.emit();
        });
      },
      async stop() {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    }) as QueryResult.QueryResult<SchemaRegistry.ExtractQueryResult<Q>>;
  }

  // TODO(burdon): Tighten type signature to TypedObject?
  async register(inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.RuntimeType[]> {
    const results: Type.RuntimeType[] = [];

    // TODO(dmaretskyi): Check for conflicts with the schema in the DB.
    for (const input of inputs) {
      if (Schema.isSchema(input)) {
        results.push(this._addSchema(input));
      } else if (typeof input === 'object' && 'typename' in input && 'version' in input && 'jsonSchema' in input) {
        const schema = this._addSchema(
          Type.toEffectSchema({
            ...input.jsonSchema,
            typename: input.typename,
            version: input.version,
          }),
        );
        results.push(schema);
        if (input.name) {
          schema.persistentSchema.name = input.name;
        }
      } else {
        throw new TypeError('Invalid schema');
      }
    }
    return results;
  }

  /**
   * @deprecated Use `query` instead.
   */
  public getSchema(typename: string): Type.RuntimeType | undefined {
    return this.query({ typename }).runSync()[0];
  }

  /**
   * @deprecated Use `query` instead.
   */
  public getSchemaById(id: string): Type.RuntimeType | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }

    const typeObject = this._db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }

    if (!Schema.is(PersistentSchema)(typeObject)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }

    return this._register(typeObject);
  }

  /**
   * @internal
   *
   * Registers a PersistentSchema object if necessary and returns a Type.RuntimeType object.
   */
  _registerSchema(schema: PersistentSchema): Type.RuntimeType {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    const registered = this._register(schema);
    this._notifySchemaListChanged();
    return registered;
  }

  private _register(schema: PersistentSchema): Type.RuntimeType {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    let previousTypename: string | undefined;
    const echoSchema = new Type.RuntimeType(schema);
    const subscription = getObjectCore(schema).updates.on(() => {
      echoSchema._invalidate();
    });

    if (previousTypename !== undefined && schema.typename !== previousTypename) {
      if (this._schemaByType.get(previousTypename) === echoSchema) {
        this._schemaByType.delete(previousTypename);
      }
      previousTypename = schema.typename;
      this._schemaByType.set(schema.typename, echoSchema);
      this._notifySchemaListChanged();
    }

    this._schemaById.set(schema.id, echoSchema);
    this._schemaByType.set(schema.typename, echoSchema);
    this._unsubscribeById.set(schema.id, subscription);
    return echoSchema;
  }

  // TODO(dmaretskyi): Figure out how to migrate the usages to the async `register` method.
  private _addSchema(schema: Type.Entity.Any): Type.RuntimeType {
    if (schema instanceof Type.RuntimeType) {
      schema = schema.snapshot.annotations({
        [TypeIdentifierAnnotationId]: undefined,
      });
    }

    const meta = getTypeAnnotation(schema);
    invariant(meta, 'use Schema.Struct({}).pipe(Type.Obj()) or class syntax to create a valid schema');
    const schemaToStore = createObject(PersistentSchema, {
      ...meta,
      jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
    });
    const typeId = `dxn:echo:@:${schemaToStore.id}`;
    schemaToStore.jsonSchema = JsonSchema.toJsonSchema(
      schema.annotations({
        [TypeAnnotationId]: meta,
        [TypeIdentifierAnnotationId]: typeId,
        [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
          identifier: typeId,
          kind: meta.kind,
          typename: meta.typename,
          version: meta.version,
        }),
      }),
    );

    const persistentSchema = this._db.add(schemaToStore);
    const result = this._register(persistentSchema);

    this._notifySchemaListChanged();
    result._rebuild();
    return result;
  }

  private _unregister(id: string): void {
    const schema = this._schemaById.get(id);
    if (schema != null) {
      this._schemaById.delete(id);
      this._schemaByType.delete(schema.typename);
      this._unsubscribeById.get(schema.id)?.();
      this._unsubscribeById.delete(schema.id);
    }
  }

  private _subscribe(callback: SchemaSubscriptionCallback): CleanupFn {
    callback([...this._schemaById.values()]);
    this._schemaSubscriptionCallbacks.push(callback);
    return () => {
      const index = this._schemaSubscriptionCallbacks.indexOf(callback);
      if (index >= 0) {
        this._schemaSubscriptionCallbacks.splice(index, 1);
      }
    };
  }

  private _notifySchemaListChanged(): void {
    const list = [...this._schemaById.values()];
    this._schemaSubscriptionCallbacks.forEach((s) => s(list));
  }
}

const validateStoredSchemaIntegrity = (schema: PersistentSchema) => {
  if (!schema.jsonSchema.$id && !schema.jsonSchema.$id?.startsWith('dxn:')) {
    log.warn('Schema is missing $id or has invalid $id', { schema });
    return false;
  }

  if (schema.jsonSchema.type !== 'object') {
    log.warn('Schema is not of object type', { schema });
    return false;
  }

  return true;
};

const getObjectIdFromSchema = (schema: Schema.Schema.AnyNoContext): ObjectId | undefined => {
  const echoIdentifier = getTypeIdentifierAnnotation(schema);
  if (!echoIdentifier) {
    return undefined;
  }

  const dxn = DXN.parse(echoIdentifier);
  invariant(dxn.isLocalObjectId());
  return dxn.parts[1];
};
