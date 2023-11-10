//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/aurora/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

import { faker } from '@faker-js/faker';

import { Expando, type TypedObject, Schema, type Space } from '@dxos/client/echo';

import { type TestGeneratorMap, type TestObjectProvider, type TestSchemaMap } from './types';
import { range } from './util';

/**
 * Typed object generator.
 */
export class TestObjectGenerator<T extends string> {
  // prettier-ignore
  constructor(
    public readonly schema: TestSchemaMap<T>,
    private readonly _generators: TestGeneratorMap<T>,
    private readonly _provider?: TestObjectProvider<T>
  ) {}

  get schemas(): Schema[] {
    return Object.values(this.schema);
  }

  getSchema(typename: string) {
    return this.schemas.find((schema) => schema.typename === typename);
  }

  createObject({ types }: { types?: T[] } = {}): TypedObject {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this.schema) as T[]));
    const data = this._generators[type](this._provider);
    // TODO(burdon): Runtime type check via: https://github.com/Effect-TS/schema (or zod).
    return new Expando(data, { schema: this.schema[type] });
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
  private readonly _space: Space;

  constructor(space: Space, schemaMap: TestSchemaMap<T>, generators: TestGeneratorMap<T>) {
    super(merge(space, schemaMap), generators, (type: T) => {
      const { objects } = this._space.db.query((object) => {
        return object.__schema === schemaMap[type];
      });

      return objects;
    });

    this._space = space;
  }

  addSchemas() {
    this.schemas.forEach((schema) => this._space.db.add(schema));
    return this.schemas;
  }

  override createObject({ types }: { types?: T[] } = {}): Expando {
    return this._space.db.add(super.createObject({ types }));
  }
}

const merge = <T extends string>(space: Space, schemaMap: TestSchemaMap<T>) => {
  const { objects } = space.db.query(Schema.filter());
  Object.keys(schemaMap).forEach((type) => {
    const schema = objects.find((object) => object.typename === type);
    if (schema) {
      (schemaMap as any)[type] = schema;
    }
  });

  return schemaMap;
};
