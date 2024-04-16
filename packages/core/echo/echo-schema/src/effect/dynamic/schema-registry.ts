//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { DynamicEchoSchema } from './dynamic-schema';
import { StoredEchoSchema } from './stored-schema';
import { getAutomergeObjectCore } from '../../automerge';
import { type EchoDatabase } from '../../database';
import { Filter } from '../../query';
import { effectToJsonSchema } from '../json-schema';
import * as E from '../reactive';
import { type EchoObjectAnnotation, EchoObjectAnnotationId, getEchoObjectAnnotation } from '../reactive';

export class DynamicSchemaRegistry {
  private readonly _schemaById: Map<string, DynamicEchoSchema> = new Map();
  private readonly _schemaByType: Map<string, DynamicEchoSchema> = new Map();
  private readonly _unsubscribeFnList: Array<() => void> = [];
  constructor(private readonly db: EchoDatabase) {}

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
    if (E.typeOf(typeObject)?.itemId === 'dxos.schema.Schema') {
      // TODO: compatibility with old dynamic schema
      return undefined;
    }
    if (!(typeObject instanceof StoredEchoSchema)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }
    return this.register(typeObject);
  }

  public getByTypename(typename: string): DynamicEchoSchema | undefined {
    return this.db
      .query(Filter.schema(StoredEchoSchema, (s) => s.typename === typename))
      .objects.map((stored) => this.register(stored))[0];
  }

  public getAll(): DynamicEchoSchema[] {
    return this.db.query(Filter.schema(StoredEchoSchema)).objects.map((stored) => {
      return this.register(stored);
    });
  }

  public add(schema: S.Schema<any>): DynamicEchoSchema {
    const typeAnnotation = getEchoObjectAnnotation(schema);
    invariant(typeAnnotation, 'use S.struct({}).pipe(E.echoObject(...)) or class syntax to create a valid schema');
    const schemaToStore = E.create(StoredEchoSchema, {
      typename: typeAnnotation.typename,
      version: typeAnnotation.version,
      jsonSchema: {},
    });
    const updatedSchema = schema.annotations({
      [EchoObjectAnnotationId]: { ...typeAnnotation, storedSchemaId: schemaToStore.id } satisfies EchoObjectAnnotation,
    });
    schemaToStore.jsonSchema = effectToJsonSchema(updatedSchema);
    const storedSchema = this.db.add(schemaToStore);
    return this.register(storedSchema);
  }

  public register(schema: StoredEchoSchema): DynamicEchoSchema {
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
    this._unsubscribeFnList.push(subscription);
    return dynamicSchema;
  }

  public clear() {
    this._unsubscribeFnList.forEach((fn) => fn());
    this._unsubscribeFnList.length = 0;
    this._schemaById.clear();
  }
}
