//
// Copyright 2024 DXOS.org
//

import { Event, type UnsubscribeCallback } from '@dxos/async';
import {
  getObjectAnnotation,
  type JsonSchemaType,
  makeStaticSchema,
  MutableSchema,
  type ObjectAnnotation,
  ObjectAnnotationId,
  type ObjectId,
  type S,
  type StaticSchema,
  StoredSchema,
  toJsonSchema,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { createStoredSchema } from '@dxos/live-object';
import { log } from '@dxos/log';

import { type EchoDatabase } from './database';
import { getObjectCore, type ReactiveEchoObject } from '../echo-handler';
import { Filter, type Query } from '../query';
import type {
  AnyEchoObjectSchema,
  MutableSchemaRegistryOptions,
  RegisterSchemaInput,
  SchemaId,
  SchemaRecord,
  SchemaRegistry,
  SchemaRegistryPreparedQuery,
  SchemaRegistryQuery,
  SchemaSubscriptionCallback,
} from './schema-registry-api';
import { SchemaRegistryPreparedQueryImpl, type SchemaRegistryQueryResolver } from './schema-registry-prepared-query';
import { Context } from '@dxos/context';
import { SchemaRecordImpl } from './schema-record';
import { DXN } from '@dxos/keys';

/**
 * Per-space set of mutable schemas.
 */
// TODO(burdon): Reconcile with RuntimeSchemaRegistry.
export class MutableSchemaRegistry implements SchemaRegistry {
  private readonly _registeredSchemaCache = new WeakMap<AnyEchoObjectSchema, SchemaRecord>();

  private readonly _schemaById: Map<string, MutableSchema> = new Map();
  private readonly _schemaByType: Map<string, MutableSchema> = new Map();
  private readonly _unsubscribeById: Map<string, UnsubscribeCallback> = new Map();
  private readonly _schemaSubscriptionCallbacks: SchemaSubscriptionCallback[] = [];

  constructor(
    private readonly _db: EchoDatabase,
    { reactiveQuery = true }: MutableSchemaRegistryOptions = {},
  ) {
    // TODO(burdon): This shouldn't go here in the constructor and should be unregisterd. Open/dispose pattern.
    if (reactiveQuery) {
      this._db.query(Filter.schema(StoredSchema)).subscribe(({ objects }) => {
        const currentObjectIds = new Set(objects.map((o) => o.id));
        const newObjects = objects.filter((object) => !this._schemaById.has(object.id));
        const removedObjects = [...this._schemaById.keys()].filter((oid) => !currentObjectIds.has(oid));
        newObjects.forEach((obj) => this._register(obj));
        removedObjects.forEach((idoid) => this._unregister(idoid));
        if (newObjects.length > 0 || removedObjects.length > 0) {
          this._notifySchemaListChanged();
        }
      });
    }
  }

  // TODO(dmaretskyi): Check schema validity: must be an object with $id, properties.id.
  async register(inputs: RegisterSchemaInput[]): Promise<SchemaRecord[]> {
    const result: SchemaRecord[] = [];
    for (const input of inputs) {
      if (!input.schema && !input.jsonSchema) {
        throw new TypeError('either jsonSchema or schema must be provided');
      }
      const jsonSchema = input.schema ? toJsonSchema(input.schema) : input.jsonSchema;
      invariant(jsonSchema);
      const typename = jsonSchema.echo?.type?.typename;
      const version = jsonSchema.echo?.type?.version;
      invariant(typename && version);

      const storedSchema = createStoredSchema({ typename, version }, jsonSchema);
      // TODO(dmaretskyi): Remove schemaId.
      storedSchema.jsonSchema.echo!.type!.schemaId = storedSchema.id;

      const existingSchema = await this.query({ typename, version }).run();
      if (existingSchema.length > 0) {
        // TODO(dmaretskyi): Validate and error out if we are inserting the same or incompatible version.
        log.warn(`Schema with typename ${typename} already exists`);
      }

      invariant(validateStoredSchemaIntegrity(storedSchema));

      this._db.add(storedSchema);
      result.push(createSchemaRecordFromStoredSchema(storedSchema));
    }

    return result;
  }

  // TODO(burdon): Can this be made sync?
  // public async query(): Promise<MutableSchema[]> {
  //   const { objects } = await this._db.query(Filter.schema(StoredSchema)).run();
  //   return objects.map((stored) => {
  //     return this._register(stored);
  //   });
  // }

  query(query: SchemaRegistryQuery = {}): SchemaRegistryPreparedQuery<SchemaRecord> {
    return new SchemaRegistryPreparedQueryImpl(
      new SchemaRegistryQueryResolverImpl(this._db.query(Filter.schema(StoredSchema)), query),
    );
  }

  getRegisteredSchema(schema: AnyEchoObjectSchema): SchemaRecord | undefined {
    const cachedRecord = this._registeredSchemaCache.get(schema);
    if(cachedRecord) {
      return cachedRecord;
    }

    const schemaId = getEchoIdentifierAnnotation(schema);
  }

  /**
   * @deprecated
   */
  public _hasSchema(schema: S.Schema<any>): boolean {
    const schemaId = schema instanceof MutableSchema ? schema.id : getObjectAnnotation(schema)?.schemaId;
    return schemaId != null && this._getSchemaById(schemaId) != null;
  }

  /**
   * @deprecated
   */
  public _getSchema(typename: string): MutableSchema | undefined {
    return this._schemaByType.get(typename);
  }

  /**
   * @deprecated
   */
  public _getSchemaById(id: string): MutableSchema | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }

    const typeObject = this._db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }

    if (!(typeObject instanceof StoredSchema)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }

    return this._register(typeObject);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Reconcile with query.
  public async _listAll(): Promise<StaticSchema[]> {
    const { objects } = await this._db.query(Filter.schema(StoredSchema)).run();
    const storedSchemas = objects.map((storedSchema) => {
      const schema = new MutableSchema(storedSchema);
      return {
        id: storedSchema.id,
        version: storedSchema.version,
        typename: schema.typename,
        schema: schema.schema,
      } satisfies StaticSchema;
    });

    const runtimeSchemas = this._db.graph.schemaRegistry.schemas.map(makeStaticSchema);
    return [...runtimeSchemas, ...storedSchemas];
  }

  /**
   * @deprecated
   */
  public _subscribe(callback: SchemaSubscriptionCallback): UnsubscribeCallback {
    callback([...this._schemaById.values()]);
    this._schemaSubscriptionCallbacks.push(callback);
    return () => {
      const index = this._schemaSubscriptionCallbacks.indexOf(callback);
      if (index >= 0) {
        this._schemaSubscriptionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Tighten type signature to AbstractSchema?
  public addSchema(schema: S.Schema<any>): MutableSchema {
    const meta = getObjectAnnotation(schema);
    invariant(meta, 'use S.Struct({}).pipe(EchoObject(...)) or class syntax to create a valid schema');
    const schemaToStore = createStoredSchema(meta);
    const updatedSchema = schema.annotations({
      [ObjectAnnotationId]: { ...meta, schemaId: schemaToStore.id } satisfies ObjectAnnotation,
    });

    schemaToStore.jsonSchema = toJsonSchema(updatedSchema);
    const storedSchema = this._db.add(schemaToStore);
    const result = this._register(storedSchema);
    this._notifySchemaListChanged();
    result.rebuild();
    return result;
  }

  /**
   * @deprecated
   */
  public registerSchema(schema: StoredSchema): MutableSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    const registered = this._register(schema);
    this._notifySchemaListChanged();
    return registered;
  }

  private _register(schema: StoredSchema): MutableSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    let previousTypename: string | undefined;

    const mutableSchema = new MutableSchema(schema);
    const subscription = getObjectCore(schema).updates.on(() => {
      mutableSchema.invalidate();
    });

    if (previousTypename !== undefined && schema.typename !== previousTypename) {
      if (this._schemaByType.get(previousTypename) === mutableSchema) {
        this._schemaByType.delete(previousTypename);
      }
      previousTypename = schema.typename;
      this._schemaByType.set(schema.typename, mutableSchema);

      this._notifySchemaListChanged();
    }

    this._schemaById.set(schema.id, mutableSchema);
    this._schemaByType.set(schema.typename, mutableSchema);
    this._unsubscribeById.set(schema.id, subscription);
    return mutableSchema;
  }

  private _unregister(id: string) {
    const schema = this._schemaById.get(id);
    if (schema != null) {
      this._schemaById.delete(id);
      this._schemaByType.delete(schema.typename);
      this._unsubscribeById.get(schema.id)?.();
      this._unsubscribeById.delete(schema.id);
    }
  }

  private _notifySchemaListChanged() {
    const list = [...this._schemaById.values()];
    this._schemaSubscriptionCallbacks.forEach((s) => s(list));
  }
}

/**
 * Queries the schema stored in the DB and projects the results into the SchemaRecord.
 */
class SchemaRegistryQueryResolverImpl implements SchemaRegistryQueryResolver<SchemaRecord> {
  private _startCtx?: Context = undefined;

  constructor(
    private readonly _storedSchemaQuery: Query<StoredSchema>,
    private readonly _filter: SchemaRegistryQuery,
  ) {}

  readonly changes = new Event<void>();

  async start(): Promise<void> {
    this._startCtx = Context.default();
    this._startCtx.onDispose(this._storedSchemaQuery.subscribe());
  }

  async stop(): Promise<void> {
    this._startCtx?.dispose();
    this._startCtx = undefined;
  }

  async getResults(): Promise<SchemaRecord[]> {
    const { objects } = await this._storedSchemaQuery.run();
    return this._filterMapRecords(objects);
  }

  getResultsSync(): SchemaRecord[] {
    const results = this._storedSchemaQuery.runSync();
    return this._filterMapRecords(results.map((result) => result.object!));
  }

  // TODO(dmaretskyi): Predictable cross-peer order by latest/earliest?.
  private _filterMapRecords(objects: StoredSchema[]): SchemaRecord[] {
    return (
      objects
        .filter((schema) => validateStoredSchemaIntegrity(schema))
        .filter((object) => {
          const idFilter = coerceArray(this._filter.id);
          if (idFilter.length > 0) {
            if (!idFilter.includes(getSchemaId(object))) {
              return false;
            }
          }

          const backingObjectIdFilter = coerceArray(this._filter.backingObjectId);
          if (backingObjectIdFilter.length > 0) {
            if (!backingObjectIdFilter.includes(object.id)) {
              return false;
            }
          }

          const typenameFilter = coerceArray(this._filter.typename);
          if (typenameFilter.length > 0) {
            if (!typenameFilter.includes(object.typename)) {
              return false;
            }
          }

          if (this._filter.version) {
            if (!this._filter.version.match(/^[0-9\.]+$/)) {
              throw new Error('Semver version ranges not supported.');
            }

            if (object.version !== this._filter.version) {
              return false;
            }
          }

          return true;
        })
        .map((object) => createSchemaRecordFromStoredSchema(object))
        // TODO(dmaretskyi): Come up with a better stable sorting method.
        .sort((a, b) => a.id.localeCompare(b.id))
    );
  }
}

const createSchemaRecordFromStoredSchema = (storedSchema: StoredSchema): SchemaRecord => {
  invariant(storedSchema);
  return new SchemaRecordImpl(getSchemaId(storedSchema), storedSchema);
};

const getSchemaId = (storedSchema: StoredSchema): SchemaId => {
  const id = storedSchema.jsonSchema.$id as SchemaId;
  invariant(typeof id === 'string' && id.length > 0 && DXN.isDXNString(id), 'Invalid schema id');
  return id;
};

const coerceArray = <T>(arr: T | T[] | undefined): T[] => {
  if (arr === undefined) {
    return [];
  }
  return Array.isArray(arr) ? arr : [arr];
};

const validateStoredSchemaIntegrity = (schema: StoredSchema) => {
  if (!schema.jsonSchema.$id && !schema.jsonSchema.$id?.startsWith('dxn:')) {
    log.warn('Schema is missing $id or has invalid $id', { schema });
    return false;
  }

  if (schema.jsonSchema.type !== 'object') {
    log.warn('Schema is not of object type', { schema });
    return false;
  }

  // TODO(dmaretskyi): Remove.
  if (schema.jsonSchema.echo?.type?.schemaId !== schema.id) {
    log.warn('Schema is missing echo type schemaId', { schema });
    return false;
  }

  return true;
};
