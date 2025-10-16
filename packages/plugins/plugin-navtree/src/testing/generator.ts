//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type NodeArg } from '@dxos/app-graph';
import { type Live, Obj, Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/react-ui/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

// TODO(burdon): Commit to using ECHO to generate all test data? Or convert from raw data?
export type TestItem = { id: string; type: string } & Record<string, any>;

type ObjectDataGenerator = {
  createSchema?: () => Schema.Schema.AnyNoContext;
  createData: () => any;
};

type ObjectFactory<T extends Live<any>> = {
  schema?: Schema.Schema.AnyNoContext; // TODO(burdon): Support both typed and expando schema.
  createObject: () => T;
};

type ObjectFactoryMap = { [type: string]: ObjectFactory<any> };

const createFactory = ({ createSchema, createData }: ObjectDataGenerator) => {
  const schema = createSchema?.();
  return {
    schema,
    createObject: () => (schema ? Obj.make(schema, createData()) : Obj.make(Type.Expando, createData())),
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

  image: {
    createData: () => ({
      title: faker.lorem.sentence(3),
      image: faker.helpers.arrayElement(data.images),
      body: faker.datatype.boolean() ? faker.lorem.sentences() : undefined,
    }),
  },

  project: {
    createSchema: () =>
      class ProjectType extends TypedObject({
        typename: 'example.com/type/Project',
        version: '0.1.0',
      })({
        title: Schema.String,
        repo: Schema.String,
        status: Schema.String,
        priority: Schema.Number,
      }) {},

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

  get schema(): Schema.Schema.AnyNoContext[] {
    return Object.values(this.factories).map((f) => f.schema!);
  }

  createObject({ types }: { types?: string[] } = {}) {
    const type = faker.helpers.arrayElement(types ?? Object.keys(this.factories));
    const factory = this.factories[type];
    return factory?.createObject();
  }

  createObjects({ types, length }: { types?: string[]; length: number }) {
    return range(length, () => this.createObject({ types }));
  }
}

// https://unsplash.com
// TODO(burdon): Use https://picsum.photos?
const data = {
  images: [
    '/images/image-1.png',
    '/images/image-2.png',
    '/images/image-3.png',
    '/images/image-4.png',
    '/images/image-5.png',
    '/images/image-6.png',
  ],
};

export const createTree = () => {
  const generator = new TestObjectGenerator({ types: ['document'] });

  const initialContent = {
    id: 'root',
    data: null,
    type: 'root',
    properties: {
      label: 'Root',
      icon: 'ph--circle--regular',
    },
    nodes: [...Array(4)].map(() => {
      const l0 = generator.createObject();
      return {
        id: faker.string.uuid(),
        data: null,
        type: 'category',
        properties: {
          label: l0.title,
          icon: 'ph--horse--regular',
          disposition: 'collection',
        },
        nodes: [
          ...[...Array(4)].map(() => {
            const l1 = generator.createObject();
            return {
              id: faker.string.uuid(),
              data: null,
              type: 'document',
              properties: {
                label: l1.title,
                icon: 'ph--butterfly--regular',
              },
              nodes: [
                {
                  id: `${faker.string.uuid()}__a1`,
                  data: () => {},
                  type: 'action',
                  properties: {
                    label: faker.lorem.words(2),
                    icon: 'ph--boat--regular',
                  },
                },
                {
                  id: `${faker.string.uuid()}__a2`,
                  data: () => {},
                  type: 'action',
                  properties: {
                    label: faker.lorem.words(2),
                    icon: 'ph--train-simple--regular',
                  },
                },
              ],
            } satisfies NodeArg<any>;
          }),
          {
            id: `${faker.string.uuid()}__a1`,
            data: () => {},
            type: 'action',
            properties: {
              label: faker.lorem.words(2),
              icon: 'ph--boat--regular',
            },
          },
          {
            id: `${faker.string.uuid()}__a2`,
            data: () => {},
            type: 'action',
            properties: {
              label: faker.lorem.words(2),
              icon: 'ph--train-simple--regular',
            },
          },
        ],
      } satisfies NodeArg<any>;
    }),
  } satisfies NodeArg<any>;

  return initialContent;
};
