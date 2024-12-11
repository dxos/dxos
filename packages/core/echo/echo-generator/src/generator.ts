//
// Copyright 2023 DXOS.org
//

import { Filter, type Space } from '@dxos/client/echo';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { getObjectAnnotation, MutableSchema, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { create, getSchema, isReactiveObject, type ReactiveObject } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

import { type TestSchemaType } from './data';
import {
  type MutationsProviderParams,
  type TestGeneratorMap,
  type TestMutationsMap,
  type TestObjectProvider,
  type TestSchemaMap,
} from './types';

/**
 * Typed object generator.
 */
export class TestObjectGenerator<T extends string = TestSchemaType> {
  // prettier-ignore
  constructor(
    protected readonly _schemas: TestSchemaMap<T>,
    private readonly _generators: TestGeneratorMap<T>,
    private readonly _provider?: TestObjectProvider<T>,
  ) {}

  get schemas(): (MutableSchema | S.Schema<any>)[] {
    return Object.values(this._schemas);
  }

  getSchema(type: T): MutableSchema | S.Schema<any> | undefined {
    return this.schemas.find((schema) => getObjectAnnotation(schema)!.typename === type);
  }

  protected setSchema(type: T, schema: MutableSchema | S.Schema<any>) {
    this._schemas[type] = schema;
  }

  async createObject({ types }: { types?: T[] } = {}): Promise<ReactiveObject<any>> {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this._schemas) as T[]));
    const data = await this._generators[type](this._provider);
    if (isReactiveObject(data)) {
      return data;
    }

    const schema = this.getSchema(type);
    return schema ? create(schema, data) : create(data);
  }

  // TODO(burdon): Based on dependencies (e.g., organization before contact).
  async createObjects(map: Partial<Record<T, number>>) {
    const tasks = Object.entries<number>(map as any)
      .map(([type, count]) => {
        return range(count, () => this.createObject({ types: [type as T] }));
      })
      .flatMap((t) => t);

    return Promise.all(tasks);
  }
}

/**
 * Typed object generator for a space.
 */
export class SpaceObjectGenerator<T extends string> extends TestObjectGenerator<T> {
  constructor(
    private readonly _space: Space,
    schemaMap: TestSchemaMap<T>,
    generators: TestGeneratorMap<T>,
    private readonly _mutations?: TestMutationsMap<T>,
  ) {
    super(schemaMap, generators, async (type: T) => {
      const schema = this.getSchema(type);
      return (schema && (await this._space.db.query(Filter.schema(schema)).run()).objects) ?? [];
    });

    // TODO(burdon): Map initially are objects that have not been added to the space.
    // Merge existing schema in space with defaults.
    Object.entries<MutableSchema | S.Schema<any>>(schemaMap).forEach(([type, dynamicSchema]) => {
      const schema = this._maybeRegisterSchema(type, dynamicSchema);
      this.setSchema(type as T, schema);
    });
  }

  addSchemas() {
    const result: (MutableSchema | S.Schema<any>)[] = [];
    for (const [typename, schema] of Object.entries(this._schemas)) {
      result.push(this._maybeRegisterSchema(typename, schema as MutableSchema | S.Schema<any>));
    }

    return result;
  }

  override async createObject({ types }: { types?: T[] } = {}): Promise<ReactiveEchoObject<any>> {
    return this._space.db.add(await super.createObject({ types }));
  }

  private _maybeRegisterSchema(typename: string, schema: MutableSchema | S.Schema<any>): MutableSchema | S.Schema<any> {
    if (schema instanceof MutableSchema) {
      const existingSchema = this._space.db.schemaRegistry.getSchema(typename);
      if (existingSchema != null) {
        return existingSchema;
      }
      return this._space.db.schemaRegistry.addSchema(schema);
    } else {
      const existingSchema = this._space.db.graph.schemaRegistry.getSchema(typename);
      if (existingSchema != null) {
        return existingSchema;
      }
      this._space.db.graph.schemaRegistry.addSchema([schema]);
      return schema;
    }
  }

  async mutateObject(object: ReactiveEchoObject<any>, params: MutationsProviderParams) {
    invariant(this._mutations, 'Mutations not defined.');
    const type = getObjectAnnotation(getSchema(object)!)!.typename as T;
    invariant(type && this._mutations?.[type], 'Invalid object type.');

    await this._mutations![type](object, params);
  }

  async mutateObjects(objects: ReactiveEchoObject<any>[], params: MutationsProviderParams) {
    for (const object of objects) {
      await this.mutateObject(object, params);
    }
  }
}
