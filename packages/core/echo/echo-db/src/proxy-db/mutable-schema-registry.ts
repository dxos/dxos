//
// Copyright 2024 DXOS.org
//

import { type UnsubscribeCallback } from '@dxos/async';
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
import { Filter } from '../query';

export type SchemaSubscriptionCallback = (schema: MutableSchema[]) => void;

export interface SchemaRegistry {
  query(query: SchemaRegistryQuery): SchemaRegistryLiveQuery<SchemaRecord>;

  /**
   * Registers the provided schema.
   *
   * @returns Schema records after registration.
   *
   * The behavior of this method depends on the state of the database. The general
   * principle is that the schema will be upserted into the space. If an equivalent
   * schema with the same name and version already exists, the method does nothing.
   * If a different schema with the same name and version exists, the method throws
   * an error. If no schema with the same name and version exists, a new schema will
   * be inserted based on semantic versioning rules.
   */
  register(input: RegisterSchemaInput[]): Promise<SchemaRecord[]>;

  /**
   * @deprecated Use `query()`.
   */
  getSchema(typename: string): MutableSchema | undefined;

  /**
   * @deprecated Use `query()`.
   */
  subscribe(cb: SchemaSubscriptionCallback): UnsubscribeCallback;
}

export type SchemaRegistryQuery = {
  /**
   * Filter by schema ID.
   * Schema id is a DXN with `echo` or `type` kind.
   */
  id?: string[];

  /**
   * One or more typenames to filter by.
   */
  typename?: string[];

  /**
   * [Semver Range](https://docs.npmjs.com/cli/v6/using-npm/semver#ranges) for the schema version.
   */
  version?: string;
};

export interface SchemaRegistryLiveQuery<T> {
  /**
   * Returns query results synchronously.
   * Supports signals notifications.
   * User must call `subscribe` for reactive notifications to be enabled.
   */
  get results(): T[];

  /**
   * Runs the query and returns all results.
   */
  run(): Promise<T[]>;

  /**
   * Runs the query and returns first result.
   *
   * @throws If query returns 0 entries.
   */
  first(): Promise<T>;

  /**
   * Subscribe to the query results reactively.
   * Enables signals notifications for `results`.
   */
  subscribe(cb: (self: this) => void, opts: { fire?: boolean }): UnsubscribeCallback;
}

/**
 * Input for schema registration.
 * Either one of the schema variants must be provided.
 * The typename, version and schema mutability metadata is read from the schema annotations.
 */
export type RegisterSchemaInput = {
  /**
   * Schema to register in the Effect format.
   */
  schema?: AnyEchoObjectSchema;

  /**
   * Schema to register in the JSON Schema format.
   */
  jsonSchema?: JsonSchemaType;
};

export type AnyEchoObjectSchema = S.Struct<{ [key: string]: S.Schema.AnyNoContext }>;

/**
 * Record of the schema stored in the registry
 */
// TODO(dmaretskyi): Replaces MutableSchema, StaticSchema.
export interface SchemaRecord {
  /**
   * String identifier for the schema.
   * In practice it's an `echo` or `type` DXN.
   */
  get id(): string;

  get mutable(): boolean;

  /**
   * @returns Rendered effect schema snapshot for this entry.
   */
  getSchema(): AnyEchoObjectSchema;

  /**
   * @returns This schema snapshot in JSON-schema format.
   */
  getJsonSchema(): JsonSchemaType;

  /**
   * Get backing ECHO object for this schema.
   */
  getBackingObject(): Promise<ReactiveEchoObject<StoredSchema> | undefined>;

  /**
   * Updates typename.
   *
   * Only callable if the schema is mutable.
   */
  updateTypename(typename: string): Promise<void>;

  /**
   * Adds fields.
   *
   * Only callable if the schema is mutable.
   */
  addFields(fields: S.Struct.Fields): Promise<void>;

  /**
   * Updates fields.
   *
   * Only callable if the schema is mutable.
   */
  updateFields(fields: S.Struct.Fields): Promise<void>;

  /**
   * Renames field.
   *
   * Only callable if the schema is mutable.
   */
  renameField({ from, to }: { from: string; to: string }): Promise<void>;

  /**
   * Removes fields.
   *
   * Only callable if the schema is mutable.
   */
  removeFields(fieldNames: string[]): Promise<void>;
}

export type MutableSchemaRegistryOptions = {
  /**
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveQuery?: boolean;
};

/**
 * Per-space set of mutable schemas.
 */
// TODO(burdon): Reconcile with RuntimeSchemaRegistry.
export class MutableSchemaRegistry implements SchemaResolver {
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

  public hasSchema(schema: S.Schema<any>): boolean {
    const schemaId = schema instanceof MutableSchema ? schema.id : getObjectAnnotation(schema)?.schemaId;
    return schemaId != null && this.getSchemaById(schemaId) != null;
  }

  public getSchema(typename: string): MutableSchema | undefined {
    return this._schemaByType.get(typename);
  }

  public getSchemaById(id: string): MutableSchema | undefined {
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
  public async listAll(): Promise<StaticSchema[]> {
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

  // TODO(burdon): Can this be made sync?
  public async query(): Promise<MutableSchema[]> {
    const { objects } = await this._db.query(Filter.schema(StoredSchema)).run();
    return objects.map((stored) => {
      return this._register(stored);
    });
  }

  public subscribe(callback: SchemaSubscriptionCallback): UnsubscribeCallback {
    callback([...this._schemaById.values()]);
    this._schemaSubscriptionCallbacks.push(callback);
    return () => {
      const index = this._schemaSubscriptionCallbacks.indexOf(callback);
      if (index >= 0) {
        this._schemaSubscriptionCallbacks.splice(index, 1);
      }
    };
  }

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
