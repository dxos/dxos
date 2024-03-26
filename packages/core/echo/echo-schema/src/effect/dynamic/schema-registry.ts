//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';

import { DynamicEchoSchema } from './dynamic-schema';
import { StoredEchoSchema } from './stored-schema';
import { getAutomergeObjectCore } from '../../automerge';
import { type EchoDatabase } from '../../database';
import { Filter } from '../../query';
import { effectToJsonSchema } from '../json-schema';
import * as E from '../reactive';
import { getEchoObjectAnnotation } from '../reactive';

export class DynamicSchemaRegistry {
  private readonly _schemaById: Map<string, DynamicEchoSchema> = new Map();
  private readonly _schemaByType: Map<string, DynamicEchoSchema> = new Map();
  private readonly _unsubscribeFnList: Array<() => void> = [];
  constructor(private readonly db: EchoDatabase) {}

  public isRegistered(schema: S.Schema<any>): boolean {
    return schema instanceof DynamicEchoSchema && this.getByTypename(schema.typename) != null;
  }

  public getByTypename(type: string): DynamicEchoSchema | undefined {
    const existing = this._schemaByType.get(type);
    if (existing != null) {
      return existing;
    }
    const byTypename = this.db
      .query(Filter.schema(StoredEchoSchema))
      .objects.map((s) => this.register(s))
      .filter((ds) => ds.typename === type);
    if (byTypename.length < 2) {
      return byTypename[0];
    }
    return byTypename.sort((s1, s2) => s1.serializedSchema.createdMs - s2.serializedSchema.createdMs)[0];
  }

  public getAll(): DynamicEchoSchema[] {
    return this.db.query(Filter.schema(StoredEchoSchema)).objects.map((stored) => {
      return this.register(stored);
    });
  }

  public add(schema: S.Schema<any>): DynamicEchoSchema {
    const typeAnnotation = getEchoObjectAnnotation(schema);
    invariant(typeAnnotation, 'use S.struct({}).pipe(E.echoObject(...)) or class syntax to create a valid schema');
    invariant(this.getByTypename(typeAnnotation.typename) == null, 'typename has to be unique');
    const storedSchema = this.db.add(
      E.object(StoredEchoSchema, {
        typename: typeAnnotation.typename,
        createdMs: Date.now(),
        version: typeAnnotation.version,
        jsonSchema: effectToJsonSchema(schema),
      }),
    );
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
