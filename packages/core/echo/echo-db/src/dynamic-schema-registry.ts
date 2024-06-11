//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { type UnsubscribeCallback } from '@dxos/async';
import {
  type EchoObjectAnnotation,
  EchoObjectAnnotationId,
  getEchoObjectAnnotation,
  makeStaticSchema,
  type StaticSchema,
} from '@dxos/echo-schema';
import { DynamicEchoSchema, StoredEchoSchema, create, effectToJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { getAutomergeObjectCore } from './automerge';
import { type EchoDatabase } from './database';
import { Filter } from './query';

type OnSchemaListChangedFn = (schemaList: DynamicEchoSchema[]) => void;

export class DynamicSchemaRegistry {
  private readonly _schemaById: Map<string, DynamicEchoSchema> = new Map();
  private readonly _schemaByType: Map<string, DynamicEchoSchema> = new Map();
  private readonly _unsubscribeFnById: Map<string, UnsubscribeCallback> = new Map();
  private readonly _onSchemaListChangeListeners: OnSchemaListChangedFn[] = [];

  constructor(private readonly db: EchoDatabase) {
    this.db.query(Filter.schema(StoredEchoSchema)).subscribe(({ objects }) => {
      const currentObjectIds = new Set(objects.map((o) => o.id));
      const newObjects = objects.filter((o) => !this._schemaById.has(o.id));
      const removedObjects = [...this._schemaById.keys()].filter((oid) => !currentObjectIds.has(oid));
      newObjects.forEach((o) => this._register(o));
      removedObjects.forEach((oid) => this._unregisterById(oid));
      if (newObjects.length > 0 || removedObjects.length > 0) {
        this._notifySchemaListChanged();
      }
    });
  }

  public isRegistered(schema: S.Schema<any>): boolean {
    const storedSchemaId =
      schema instanceof DynamicEchoSchema ? schema.id : getEchoObjectAnnotation(schema)?.storedSchemaId;
    return storedSchemaId != null && this.getById(storedSchemaId) != null;
  }

  public getById(id: string): DynamicEchoSchema | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }
    const typeObject = this.db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }
    if (!(typeObject instanceof StoredEchoSchema)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }
    return this._register(typeObject);
  }

  public getRegisteredByTypename(typename: string): DynamicEchoSchema | undefined {
    return this._schemaByType.get(typename);
  }

  public async list(): Promise<StaticSchema[]> {
    const { objects: storedSchemas } = await this.db.query(Filter.schema(StoredEchoSchema)).run();
    const storedSnapshots = storedSchemas.map((storedSchema) => {
      const schema = new DynamicEchoSchema(storedSchema);
      return {
        id: storedSchema.id,
        typename: schema.typename,
        version: storedSchema.version,
        schema: schema.schema,
      } satisfies StaticSchema;
    });
    const runtimeSnapshots = this.db.graph.schemaRegistry.schemas.map(makeStaticSchema);
    return runtimeSnapshots.concat(storedSnapshots);
  }

  public async listDynamic(): Promise<DynamicEchoSchema[]> {
    return (await this.db.query(Filter.schema(StoredEchoSchema)).run()).objects.map((stored) => {
      return this._register(stored);
    });
  }

  public subscribe(callback: OnSchemaListChangedFn): UnsubscribeCallback {
    callback([...this._schemaById.values()]);
    this._onSchemaListChangeListeners.push(callback);
    return () => {
      const index = this._onSchemaListChangeListeners.indexOf(callback);
      if (index >= 0) {
        this._onSchemaListChangeListeners.splice(index, 1);
      }
    };
  }

  public add(schema: S.Schema<any>): DynamicEchoSchema {
    const typeAnnotation = getEchoObjectAnnotation(schema);
    invariant(typeAnnotation, 'use S.Struct({}).pipe(echoObject(...)) or class syntax to create a valid schema');
    const schemaToStore = create(StoredEchoSchema, {
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

  public register(schema: StoredEchoSchema): DynamicEchoSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }
    const registered = this._register(schema);
    this._notifySchemaListChanged();
    return registered;
  }

  private _register(schema: StoredEchoSchema): DynamicEchoSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }
    const dynamicSchema = new DynamicEchoSchema(schema);
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
    this._onSchemaListChangeListeners.forEach((s) => s(list));
  }
}
