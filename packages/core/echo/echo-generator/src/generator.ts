//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/react-ui/testing.

// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

import { faker } from '@faker-js/faker';

import { Expando, type TypedObject, Schema as SchemaType } from '@dxos/client/echo';

// TODO(burdon): Util.
export const range = <T>(fn: (i: number) => T | undefined, length: number): T[] =>
  Array.from({ length })
    .map((_, i) => fn(i))
    .filter(Boolean) as T[];

// TODO(burdon): Commit to using ECHO to generate all test data? Or convert from raw data?
export type TestItem = { id: string; type: string } & Record<string, any>;

type ObjectDataGenerator = {
  createSchema?: () => SchemaType;
  createData: () => any;
};

type ObjectFactory<T extends TypedObject> = {
  schema?: SchemaType; // TODO(burdon): Support both typed and expando schema.
  createObject: () => T;
};

type ObjectFactoryMap = { [type: string]: ObjectFactory<any> };

const createFactory = ({ createSchema, createData }: ObjectDataGenerator) => {
  const schema = createSchema?.();
  return {
    schema,
    createObject: () => new Expando(createData(), { schema }),
  };
};

// TODO(burdon): Handle restricted values.
export const Status = ['pending', 'active', 'done'];
export const Priority = [1, 2, 3, 4, 5];

export const defaultGenerators: { [type: string]: ObjectDataGenerator } = {
  document: {
    createData: () => ({
      title: faker.lorem.sentence(3),
      body: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
    }),
  },

  // TODO(burdon): Configure images.
  image: {
    createData: () => ({
      title: faker.lorem.sentence(3),
      body: faker.datatype.boolean() ? faker.lorem.sentences() : undefined,
    }),
  },

  project: {
    createSchema: () =>
      new SchemaType({
        props: [
          {
            id: 'title',
            type: SchemaType.PropType.STRING,
          },
          {
            id: 'repo',
            type: SchemaType.PropType.STRING,
          },
          {
            id: 'status',
            type: SchemaType.PropType.STRING,
          },
          {
            id: 'priority',
            type: SchemaType.PropType.NUMBER,
          },
        ],
      }),
    createData: () => ({
      title: faker.commerce.productName(),
      repo: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
      status: faker.helpers.arrayElement(Status),
      priority: faker.helpers.arrayElement(Priority),
    }),
  },
};

/**
 * Typed object generator.
 */
export class TestObjectGenerator {
  public readonly factories: ObjectFactoryMap;

  constructor({ types, factories }: { types?: string[]; factories?: ObjectFactoryMap } = {}) {
    this.factories =
      factories ??
      (types ?? Object.keys(defaultGenerators)).reduce<ObjectFactoryMap>((acc, type) => {
        acc[type] = createFactory(defaultGenerators[type]);
        return acc;
      }, {});
  }

  get schema(): SchemaType[] {
    return Object.values(this.factories).map((f) => f.schema!);
  }

  createObject({ types }: { types?: string[] } = {}) {
    const type = faker.helpers.arrayElement(types ?? Object.keys(this.factories));
    const factory = this.factories[type];
    return factory?.createObject();
  }

  createObjects({ types, length }: { types?: string[]; length: number }) {
    return range(() => this.createObject({ types }), length);
  }
}
