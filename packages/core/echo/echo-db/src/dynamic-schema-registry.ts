//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { type UnsubscribeCallback } from '@dxos/async';
import {
  getEchoObjectAnnotation,
  EchoObjectAnnotationId,
  type EchoObjectAnnotation,
  type StaticSchema,
  makeStaticSchema,
} from '@dxos/echo-schema';
import { DynamicSchema, StoredSchema, create, effectToJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { getAutomergeObjectCore } from './automerge';
import { type EchoDatabase } from './database';
import { Filter } from './query';

type SchemaListChangedCallback = (schema: DynamicSchema[]) => void;

/**
 * Per-space set of mutable schemas.
 */
export class DynamicSchemaRegistry {
  private readonly _schemaById: Map<string, DynamicSchema> = new Map();
  private readonly _schemaByType: Map<string, DynamicSchema> = new Map();
  private readonly _unsubscribeFnById: Map<string, UnsubscribeCallback> = new Map();
  private readonly _schemaListChangeListeners: SchemaListChangedCallback[] = [];

  constructor(private readonly db: EchoDatabase) {
    this.db.query(Filter.schema(StoredSchema)).subscribe(({ objects }) => {
      const currentObjectIds = new Set(objects.map((o) => o.id));
      const newObjects = objects.filter((o) => !this._schemaById.has(o.id));
      const removedObjects = [...this._schemaById.keys()].filter((oid) => !currentObjectIds.has(oid));
      newObjects.forEach((obj) => this._register(obj));
      removedObjects.forEach((oid) => this._unregisterById(oid));
      if (newObjects.length > 0 || removedObjects.length > 0) {
        this._notifySchemaListChanged();
      }
    });
  }

  public hasSchema(schema: S.Schema<any>): boolean {
    const storedSchemaId =
      schema instanceof DynamicSchema ? schema.id : getEchoObjectAnnotation(schema)?.storedSchemaId;
    return storedSchemaId != null && this.getSchemaById(storedSchemaId) != null;
  }

  public getSchemaByTypename(typename: string): DynamicSchema | undefined {
    return this._schemaByType.get(typename);
  }

  public getSchemaById(id: string): DynamicSchema | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }

    const typeObject = this.db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }

    if (!(typeObject instanceof StoredSchema)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }

    return this._register(typeObject);
  }

  // TODO(burdon): Remove?
  public async list(): Promise<DynamicSchema[]> {
    const { objects } = await this.db.query(Filter.schema(StoredSchema)).run();
    return objects.map((stored) => {
      return this._register(stored);
    });
  }

  // TODO(burdon): Reconcile with list.
  public async listAll(): Promise<StaticSchema[]> {
    const { objects } = await this.db.query(Filter.schema(StoredSchema)).run();
    const storedSchemas = objects.map((storedSchema) => {
      const schema = new DynamicSchema(storedSchema);
      return {
        id: storedSchema.id,
        version: storedSchema.version,
        typename: schema.typename,
        schema: schema.schema,
      } satisfies StaticSchema;
    });

    const runtimeSchemas = this.db.graph.schemaRegistry.schemas.map(makeStaticSchema);
    return [...runtimeSchemas, ...storedSchemas];
  }

  public subscribe(callback: SchemaListChangedCallback): UnsubscribeCallback {
    callback([...this._schemaById.values()]);
    this._schemaListChangeListeners.push(callback);
    return () => {
      const index = this._schemaListChangeListeners.indexOf(callback);
      if (index >= 0) {
        this._schemaListChangeListeners.splice(index, 1);
      }
    };
  }

  public addSchema(schema: S.Schema<any>): DynamicSchema {
    const typeAnnotation = getEchoObjectAnnotation(schema);
    invariant(typeAnnotation, 'use S.Struct({}).pipe(EchoObject(...)) or class syntax to create a valid schema');
    const schemaToStore = create(StoredSchema, {
      typename: typeAnnotation.typename,
      version: typeAnnotation.version,
      jsonSchema: {},
    });

    const updatedSchema = schema.annotations({
      [EchoObjectAnnotationId]: { ...typeAnnotation, storedSchemaId: schemaToStore.id } satisfies EchoObjectAnnotation,
    });

    schemaToStore.jsonSchema = effectToJsonSchema(updatedSchema);
    const storedSchema = this.db.add(schemaToStore);
    const result = this._register(storedSchema);
    this._notifySchemaListChanged();
    return result;
  }

  /**
   * @internal
   */
  registerSchema(schema: StoredSchema): DynamicSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    const registered = this._register(schema);
    this._notifySchemaListChanged();
    return registered;
  }

  private _register(schema: StoredSchema): DynamicSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    const dynamicSchema = new DynamicSchema(schema);
    const subscription = getAutomergeObjectCore(schema).updates.on(() => {
      dynamicSchema.invalidate();
    });

    this._schemaById.set(schema.id, dynamicSchema);
    this._schemaByType.set(schema.typename, dynamicSchema);
    this._unsubscribeFnById.set(schema.id, subscription);
    return dynamicSchema;
  }

  private _unregisterById(id: string) {
    const schema = this._schemaById.get(id);
    if (schema != null) {
      this._schemaById.delete(id);
      this._schemaByType.delete(schema.typename);
      this._unsubscribeFnById.get(schema.id)?.();
      this._unsubscribeFnById.delete(schema.id);
    }
  }

  private _notifySchemaListChanged() {
    const list = [...this._schemaById.values()];
    this._schemaListChangeListeners.forEach((s) => s(list));
  }
}
