//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/aurora/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

import { faker } from '@faker-js/faker';

import { Expando, type Space } from '@dxos/client/echo';

import { type TestGeneratorMap, type TestObjectProvider, type TestSchemaMap } from './types';
import { range } from './util';

/**
 * Typed object generator.
 */
export class TestObjectGenerator<T extends string> {
  // prettier-ignore
  constructor(
    private readonly schema: TestSchemaMap<T>,
    private readonly _generators: TestGeneratorMap<T>,
    private readonly _provider?: TestObjectProvider<T>
  ) {}

  createObject({ types }: { types?: T[] } = {}): Expando {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this.schema) as T[]));
    const factory = this._generators[type];
    const data = factory(this._provider);
    return new Expando(data, { schema: this.schema[type] });
  }

  // TODO(burdon): Create batch.
  createObjects({ types, count }: { types?: T[]; count: number }): Expando[] {
    return range(() => this.createObject({ types }), count);
  }
}

/**
 * Typed object generator for a space.
 */
export class SpaceObjectGenerator<T extends string> extends TestObjectGenerator<T> {
  constructor(private readonly space: Space, schema: TestSchemaMap<T>, generators: TestGeneratorMap<T>) {
    super(schema, generators, (type: T) => {
      // TODO(burdon): Query by schema.
      let i = 0;
      const { objects } = space.db.query((object) => {
        console.log('???', i++, object.id.slice(0, 8), object.__schema?.id.slice(0, 8), schema[type].id.slice(0, 8));
        return object.__schema === schema[type];
      });
      return objects;
    });
  }

  override createObject({ types }: { types?: T[] } = {}): Expando {
    return this.space.db.add(super.createObject({ types }));
  }
}
