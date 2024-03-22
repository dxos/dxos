//
// Copyright 2023 DXOS.org
//

import { Expando, type TypedObject, Schema, type Space } from '@dxos/client/echo';
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

  get schemas(): Schema[] {
    return Object.values(this._schemas);
  }

  getSchema(type: T) {
    return this.schemas.find((schema) => schema.typename === type);
  }

  protected setSchema(type: T, schema: Schema) {
    this._schemas[type] = schema;
  }

  // TODO(burdon): Runtime type check via: https://github.com/Effect-TS/schema (or zod).
  createObject({ types }: { types?: T[] } = {}): TypedObject {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this._schemas) as T[]));
    const data = this._generators[type](this._provider);
    const schema = this.getSchema(type);
    return new Expando(data, { schema });
  }

  // TODO(burdon): Create batch.
  // TODO(burdon): Based on dependencies (e.g., organization before contact).
  createObjects(map: Partial<Record<T, number>>): Expando[] {
    const objects: Expando[] = [];
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
      const { objects } = this._space.db.query((object: TypedObject) => {
        return object.__schema?.id === this.getSchema(type)?.id;
      });

      return objects;
    });

    // TODO(burdon): Map initially are objects that have not been added to the space.
    // Merge existing schema in space with defaults.
    const { objects } = this._space.db.query(Schema.filter());
    Object.keys(schemaMap).forEach((type) => {
      const schema = objects.find((object) => object.typename === type);
      if (schema) {
        this.setSchema(type as T, schema);
      }
    });
  }

  addSchemas() {
    const { objects } = this._space.db.query(Schema.filter());
    this.schemas.forEach((schema) => {
      if (!objects.find((object) => object.typename === schema.typename)) {
        this._space.db.add(schema);
      }
    });

    return this.schemas;
  }

  override createObject({ types }: { types?: T[] } = {}): Expando {
    return this._space.db.add(super.createObject({ types }));
  }
}
