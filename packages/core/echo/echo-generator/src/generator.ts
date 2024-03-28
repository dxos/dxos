//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type DynamicEchoSchema, Filter, type ReactiveObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
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

  get schemas(): DynamicEchoSchema[] {
    return Object.values(this._schemas);
  }

  getSchema(type: T): DynamicEchoSchema | undefined {
    return this.schemas.find((schema) => schema.typename === type);
  }

  protected setSchema(type: T, schema: DynamicEchoSchema) {
    this._schemas[type] = schema;
  }

  // TODO(burdon): Runtime type check via: https://github.com/Effect-TS/schema (or zod).
  createObject({ types }: { types?: T[] } = {}): ReactiveObject<any> {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this._schemas) as T[]));
    const data = this._generators[type](this._provider);
    const schema = this.getSchema(type);
    return schema ? E.object(schema, data) : E.object(data);
  }

  // TODO(burdon): Create batch.
  // TODO(burdon): Based on dependencies (e.g., organization before contact).
  createObjects(map: Partial<Record<T, number>>): ReactiveObject<any>[] {
    const objects: ReactiveObject<any>[] = [];
    Object.entries<number>(map as any).forEach(([type, count]) => {
      range(() => objects.push(this.createObject({ types: [type as T] })), count);
    });

    return objects;
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
    super(schemaMap, generators, (type: T) => {
      const schema = this.getSchema(type);
      return (schema && this._space.db.query(Filter.schema(schema)).objects) ?? [];
    });

    // TODO(burdon): Map initially are objects that have not been added to the space.
    // Merge existing schema in space with defaults.
    const schemas = this._space.db.schemaRegistry.getAll();
    Object.entries<DynamicEchoSchema>(schemaMap).forEach(([type, dynamicSchema]) => {
      let schema = schemas.find((object) => object.typename === type);
      if (schema == null) {
        schema = this._space.db.schemaRegistry.add(dynamicSchema.schema);
      }
      this.setSchema(type as T, schema);
    });
  }

  addSchemas() {
    const result: DynamicEchoSchema[] = [];
    const dbSchemas = this._space.db.schemaRegistry.getAll();
    this.schemas.forEach((schema) => {
      const existing = dbSchemas.find((object) => object.typename === schema.typename);
      if (existing == null) {
        result.push(this._space.db.schemaRegistry.add(schema.schema));
      } else {
        result.push(existing);
      }
    });

    return result;
  }

  override createObject({ types }: { types?: T[] } = {}): ReactiveObject<any> {
    return this._space.db.add(super.createObject({ types }));
  }
}
