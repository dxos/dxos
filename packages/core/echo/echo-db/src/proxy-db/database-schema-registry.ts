//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { type CleanupFn, Event } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { Filter, JsonSchema, type QueryResult, type SchemaRegistry, Type } from '@dxos/echo';
import {
  MetaId,
  TypeSchema,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  createObject,
  getTypeAnnotation,
  makeTypeJsonSchemaAnnotation,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EchoURI } from '@dxos/keys';
import { log } from '@dxos/log';
import { coerceArray, compositeKey } from '@dxos/util';

import { getObjectCore } from '../echo-handler';
import { type EchoDatabase } from './database';
import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';

// TODO(wittjosiah): Use Annotation.SystemTypeAnnotation.
const SYSTEM_SCHEMA = ['org.dxos.type.schema'];

type SchemaSubscriptionCallback = (schema: Type.Type[]) => void;

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
 * Registry of `TypeSchema` mutable schema objects within a space.
 */
export class DatabaseSchemaRegistry extends Resource implements SchemaRegistry.SchemaRegistry {
  private readonly _schemaById: Map<string, Type.Type> = new Map();
  private readonly _schemaByType: Map<string, Type.Type> = new Map();
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
      const objects = await this._db.query(Filter.type(Type.Type)).run();

      objects.forEach((object) => this._registerSchema(object));
    }

    if (this._reactiveQuery) {
      const unsubscribe = this._db.query(Filter.type(Type.Type)).subscribe((query) => {
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

  public hasSchema(schema: Type.AnyEntity): boolean {
    const schemaId = schema.id;
    return schemaId != null && this.getSchemaById(schemaId) != null;
  }

  // TODO(burdon): Refactor: this is too complex and untestable.
  query<Q extends Types.NoExcessProperties<SchemaRegistry.Query, Q>>(
    _query?: Q & SchemaRegistry.Query,
  ): QueryResult.QueryResult<Type.Type> {
    const self = this;
    const query: SchemaRegistry.Query = _query ?? {};
    const allowedLocations = query.location ?? ['database'];

    type Entry =
      | {
          source: 'runtime';
          schema: Type.AnyEntity;
        }
      | {
          source: 'database';
          schema: Type.Type;
        };

    const getSortKey = (entry: Entry) =>
      compositeKey(Type.getTypename(entry.schema), Type.getVersion(entry.schema), String(Type.getURI(entry.schema)));

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
              if (!validateStoredSchemaIntegrity(object.schema)) {
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
                if (object.schema.id == null || !backingObjectIdFilter.includes(object.schema.id)) {
                  return false;
                }
              }

              // `typename` / `version` on a persisted `Type.Type` live in
              // `ObjectMeta.key` / `ObjectMeta.version` (the canonical
              // registry-provenance pair). Read the raw meta directly so
              // unnamed drafts return `undefined` here (we don't want to
              // match draft id strings against typename queries).
              const persistedMeta = Type.getMeta(object.schema);

              const typenameFilter = coerceArray(query.typename);
              if (typenameFilter.length > 0) {
                if (persistedMeta.key == null || !typenameFilter.includes(persistedMeta.key)) {
                  return false;
                }
              }

              if (query.version) {
                if (!query.version.match(/^[0-9.]+$/)) {
                  throw new Error('Semver version ranges not supported.');
                }

                if (persistedMeta.version !== query.version) {
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
        const objects = self._db.query(Filter.type(Type.Type)).runSync();

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
      async getResults() {
        const objects = await self._db.query(Filter.type(Type.Type)).run();

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
        const unsubscribeDatabase = self._subscribe(() => {
          changes.emit();
        });
        const unsubscribeRuntime = self._db.graph.schemaRegistry.schemaChanges.on(() => {
          changes.emit();
        });
        unsubscribe = () => {
          unsubscribeDatabase();
          unsubscribeRuntime();
        };
      },
      async stop() {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    }) as QueryResult.QueryResult<Type.Type>;
  }

  // Kind-preserving overload: an object schema comes back as `AnyObj`
  // so callers can chain into `Obj.make` without casts. Each stored schema is
  // also a `Type.Type` record (referenceable via `Ref(Type.Type)`).
  async register<T extends Type.AnyEntity>(input: T[]): Promise<T[]>;
  async register(input: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.Type[]>;
  async register(inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.Type[]> {
    const results: Type.Type[] = [];

    // TODO(dmaretskyi): Check for conflicts with the schema in the DB.
    for (const input of inputs) {
      if (Type.isType(input) || Schema.isSchema(input)) {
        // Type entities (Obj/Relation/Type) and raw schemas both go through
        // `_addSchema`; unwrap the entity's source schema via `Type.getSchema`
        // before handing it to the schema-side helper. The raw-Schema branch
        // is runtime-only (not in `RegisterSchemaInput`); use `unknown` to be
        // explicit that we're escaping the declared union.
        const schema = Type.isType(input) ? Type.getSchema(input) : (input as unknown as Schema.Schema.AnyNoContext);
        results.push(this._addSchema(schema));
      } else if (typeof input === 'object' && 'typename' in input && 'version' in input && 'jsonSchema' in input) {
        const schema = this._addSchema(
          JsonSchema.toEffectSchema({
            ...input.jsonSchema,
            typename: input.typename,
            version: input.version,
          }),
        );
        results.push(schema);
        if (input.name) {
          Type.update(schema, (draft) => {
            draft.name = input.name;
          });
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
  public getSchema(typename: string): Type.Type | undefined {
    return this.query({ typename }).runSync()[0];
  }

  /**
   * @deprecated Use `query` instead.
   */
  public getSchemaById(id: string): Type.Type | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }

    const typeObject = this._db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }

    if (!Type.isType(typeObject)) {
      log.warn('type object is not a stored schema', { id });
      return undefined;
    }

    return this._register(typeObject);
  }

  /**
   * @internal
   *
   * Registers a TypeSchema object if necessary and returns the Type.Type entity.
   */
  _registerSchema(schema: TypeSchema): Type.Type {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    const registered = this._register(schema);
    this._notifySchemaListChanged();
    return registered;
  }

  private _register(schema: TypeSchema): Type.Type {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    // Track typename changes so the by-typename index stays in sync. Drafts
    // (typename === undefined) are indexed by id only. Typename lives in
    // `ObjectMeta.key` on persisted Type.Type entities — read the raw meta
    // directly so we get the user-set value (or `undefined` for drafts).
    const typeEntity: Type.Type = schema as unknown as Type.Type;
    const readTypename = (): string | undefined => Type.getMeta(schema).key;
    let previousTypename: string | undefined = readTypename();
    const subscription = getObjectCore(schema).updates.on(() => {
      const currentTypename = readTypename();
      if (currentTypename !== previousTypename) {
        if (previousTypename != null && this._schemaByType.get(previousTypename) === typeEntity) {
          this._schemaByType.delete(previousTypename);
        }
        previousTypename = currentTypename;
        if (previousTypename != null) {
          this._schemaByType.set(previousTypename, typeEntity);
        }
        this._notifySchemaListChanged();
      }
    });

    this._schemaById.set(schema.id, typeEntity);
    if (previousTypename != null) {
      this._schemaByType.set(previousTypename, typeEntity);
    }
    this._unsubscribeById.set(schema.id, subscription);
    return typeEntity;
  }

  // TODO(dmaretskyi): Figure out how to migrate the usages to the async `register` method.
  private _addSchema(schema: Schema.Schema.AnyNoContext): Type.Type {
    if (Type.isType(schema)) {
      // The snapshot preserves typename/version in annotations.
      schema = Type.getSchema(schema).annotations({
        [TypeIdentifierAnnotationId]: undefined,
      });
    }

    const meta = getTypeAnnotation(schema);
    invariant(meta, 'use Schema.Struct({}).pipe(Type.Obj()) or class syntax to create a valid schema');
    // TypeSchema only declares `name` and `jsonSchema` as data fields.
    // `typename` / `version` are the canonical registry-provenance pair and
    // live in `ObjectMeta.key` / `ObjectMeta.version` (queryable via
    // `Filter.key(...)`); they're seeded here through the `[MetaId]` symbol.
    // `meta.kind` is the entity-kind brand (set on `[KindId]` via
    // `setSchemaPropertiesOnObjectCore`), NOT a data field.
    const schemaToStore = createObject(TypeSchema, {
      [MetaId]: { key: meta.typename, version: meta.version },
      jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
    });
    // The schema's $id is the typename DXN — universal across stored and non-stored
    // schemas. The schema-as-object's storage EchoURI is tracked separately on
    // TypeIdentifierAnnotation for back-references (e.g. registry lookup by object id).
    const typeDxn = DXN.make(meta.typename, meta.version);
    const storageEchoId = EchoURI.make({ objectId: schemaToStore.id });
    // `jsonSchema` is declared readonly on the Type<A> interface; mutate it via
    // `Type.update` so the change goes through the automerge transaction.
    Type.update(schemaToStore, (draft) => {
      draft.jsonSchema = JsonSchema.toJsonSchema(
        schema.annotations({
          [TypeAnnotationId]: meta,
          [TypeIdentifierAnnotationId]: storageEchoId,
          [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
            identifier: typeDxn,
            kind: meta.kind,
            typename: meta.typename,
            version: meta.version,
          }),
        }),
      );
    });

    const persistentSchema = this._db.add(schemaToStore);
    const result = this._register(persistentSchema);

    this._notifySchemaListChanged();
    return result;
  }

  private _unregister(id: string): void {
    const schema = this._schemaById.get(id);
    if (schema != null) {
      this._schemaById.delete(id);
      // Typename lives in `ObjectMeta.key` (the canonical registry-provenance
      // field); read the raw meta directly so unnamed drafts return
      // `undefined` (rather than the `Type.getTypename` id fallback, which
      // would never match an entry in `_schemaByType`).
      const persistedTypename = Type.getMeta(schema).key;
      if (persistedTypename != null) {
        this._schemaByType.delete(persistedTypename);
      }
      if (schema.id != null) {
        this._unsubscribeById.get(schema.id)?.();
        this._unsubscribeById.delete(schema.id);
      }
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

const validateStoredSchemaIntegrity = (schema: Type.Type) => {
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
