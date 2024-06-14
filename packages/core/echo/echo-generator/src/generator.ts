//
// Copyright 2023 DXOS.org
//

import { type Space, Filter } from '@dxos/client/echo';
import { type DynamicSchema, type ReactiveObject } from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

import { type TestSchemaType } from './data';
import { type TestGeneratorMap, type TestObjectProvider, type TestSchemaMap } from './types';
import { range } from './util';

/**
 * Typed object generator.
 */
export class TestObjectGenerator<T extends string = TestSchemaType> {
  // prettier-ignore
  constructor(
    private readonly _schemas: TestSchemaMap<T>,
    private readonly _generators: TestGeneratorMap<T>,
    private readonly _provider?: TestObjectProvider<T>
  ) {}

  get schemas(): DynamicSchema[] {
    return Object.values(this._schemas);
  }

  getSchema(type: T): DynamicSchema | undefined {
    return this.schemas.find((schema) => schema.typename === type);
  }

  protected setSchema(type: T, schema: DynamicSchema) {
    this._schemas[type] = schema;
  }

  // TODO(burdon): Runtime type check via: https://github.com/Effect-TS/schema (or zod).
  async createObject({ types }: { types?: T[] } = {}): Promise<ReactiveObject<any>> {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this._schemas) as T[]));
    const data = await this._generators[type](this._provider);
    const schema = this.getSchema(type);
    return schema ? create(schema, data) : create(data);
  }

  // TODO(burdon): Create batch.
  // TODO(burdon): Based on dependencies (e.g., organization before contact).
  async createObjects(map: Partial<Record<T, number>>): Promise<ReactiveObject<any>[]> {
    const tasks = Object.entries<number>(map as any)
      .map(([type, count]) => {
        return range(() => this.createObject({ types: [type as T] }), count);
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
  ) {
    super(schemaMap, generators, async (type: T) => {
      const schema = this.getSchema(type);
      return (schema && (await this._space.db.query(Filter.schema(schema)).run()).objects) ?? [];
    });

    // TODO(burdon): Map initially are objects that have not been added to the space.
    // Merge existing schema in space with defaults.
    Object.entries<DynamicSchema>(schemaMap).forEach(([type, dynamicSchema]) => {
      let schema = this._space.db.schema.getSchemaByTypename(type);
      if (schema == null) {
        schema = this._registerSchema(dynamicSchema);
      }
      this.setSchema(type as T, schema);
    });
  }

  addSchemas() {
    const result: DynamicSchema[] = [];
    this.schemas.forEach((schema) => {
      const existing = this._space.db.schema.getSchemaByTypename(schema.typename);
      if (existing == null) {
        result.push(this._registerSchema(schema));
      } else {
        result.push(existing);
      }
    });

    return result;
  }

  override async createObject({ types }: { types?: T[] } = {}): Promise<ReactiveObject<any>> {
    return this._space.db.add(await super.createObject({ types }));
  }

  private _registerSchema(schema: DynamicSchema): DynamicSchema {
    this._space.db.add(schema.serializedSchema);
    return this._space.db.schema.registerSchema(schema.serializedSchema);
  }
}
