//
// Copyright 2024 DXOS.org
//

import { type UnsubscribeCallback } from '@dxos/async';
import {
  createStoredSchema,
  getObjectAnnotation,
  makeStaticSchema,
  toJsonSchema,
  MutableSchema,
  type ObjectAnnotation,
  ObjectAnnotationId,
  type S,
  type StaticSchema,
  StoredSchema,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type EchoDatabase } from './database';
import { getObjectCore } from '../echo-handler';
import { Filter } from '../query';

export type SchemaSubscriptionCallback = (schema: MutableSchema[]) => void;

export interface SchemaResolver {
  getSchema(typename: string): MutableSchema | undefined;
  query(): Promise<MutableSchema[]>;
  subscribe(cb: SchemaSubscriptionCallback): UnsubscribeCallback;
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
