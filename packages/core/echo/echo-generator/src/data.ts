//
// Copyright 2023 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { Schema } from 'effect';

import { createDocAccessor, type Space } from '@dxos/client/echo';
import { Ref } from '@dxos/echo-schema';
import { createEchoSchema } from '@dxos/live-object';
import { faker } from '@dxos/random';

import { SpaceObjectGenerator, TestObjectGenerator } from './generator';
import { type TestGeneratorMap, type TestMutationsMap, type TestSchemaMap } from './types';
import { randomText } from './util';

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/aurora/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

// TODO(burdon): Handle restricted values.
export const Status = ['pending', 'active', 'done'];
export const Priority = [1, 2, 3, 4, 5];

export enum TestSchemaType {
  document = 'example.com/type/document',
  organization = 'example.com/type/organization',
  contact = 'example.com/type/contact',
  project = 'example.com/type/project',
}

const testSchemas = (): TestSchemaMap<TestSchemaType> => {
  const document = createEchoSchema(
    {
      typename: TestSchemaType.document,
      version: '0.1.0',
    },
    {
      title: Schema.String.annotations({ description: 'title of the document' }),
      content: Schema.String,
    },
  );

  const organization = createEchoSchema(
    {
      typename: TestSchemaType.organization,
      version: '0.1.0',
    },
    {
      name: Schema.String.annotations({ description: 'name of the company or organization' }),
      website: Schema.String.annotations({ description: 'public website URL' }),
      description: Schema.String.annotations({ description: 'short summary of the company' }),
    },
  );

  const contact = createEchoSchema(
    {
      typename: TestSchemaType.contact,
      version: '0.1.0',
    },
    {
      name: Schema.String.annotations({ description: 'name of the person' }),
      email: Schema.String,
      org: Ref(organization),
      lat: Schema.Number,
      lng: Schema.Number,
    },
  );

  const project = createEchoSchema(
    {
      typename: TestSchemaType.project,
      version: '0.1.0',
    },
    {
      name: Schema.String.annotations({ description: 'name of the project' }),
      description: Schema.String,
      website: Schema.String,
      repo: Schema.String,
      status: Schema.String,
      priority: Schema.Number,
      active: Schema.Boolean,
      org: Ref(organization),
    },
  );

  return {
    [TestSchemaType.document]: document,
    [TestSchemaType.organization]: organization,
    [TestSchemaType.contact]: contact,
    [TestSchemaType.project]: project,
  };
};

const testObjectGenerators: TestGeneratorMap<TestSchemaType> = {
  [TestSchemaType.document]: async () => ({
    title: faker.lorem.sentence(3),
    content: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
  }),

  [TestSchemaType.organization]: async () => ({
    name: faker.company.name(),
    website: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
    description: faker.lorem.sentences(),
  }),

  [TestSchemaType.contact]: async (provider) => {
    const organizations = await provider?.(TestSchemaType.organization);
    const { location } = faker.datatype.boolean() ? faker.geo.airport() : {};
    return {
      name: faker.person.fullName(),
      email: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.email() : undefined,
      org:
        organizations?.length && faker.datatype.boolean({ probability: 0.3 })
          ? Ref.make(faker.helpers.arrayElement(organizations))
          : undefined,
      ...location,
    };
  },

  [TestSchemaType.project]: async () => ({
    name: faker.commerce.productName(),
    repo: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
    status: faker.helpers.arrayElement(Status),
    priority: faker.helpers.arrayElement(Priority),
    active: faker.datatype.boolean(),
  }),
};

const testObjectMutators: TestMutationsMap<TestSchemaType> = {
  [TestSchemaType.document]: async (object, params) => {
    const accessor = createDocAccessor(object, ['content']);
    for (let i = 0; i < params.count; i++) {
      const length = object.content?.content?.length ?? 0;
      accessor.handle.change((doc) => {
        A.splice(
          doc,
          accessor.path.slice(),
          0,
          params.maxContentLength >= length ? 0 : params.mutationSize,
          randomText(params.mutationSize),
        );
      });
    }
  },
  [TestSchemaType.organization]: async () => {
    throw new Error('Method not implemented.');
  },
  [TestSchemaType.contact]: async () => {
    throw new Error('Method not implemented.');
  },
  [TestSchemaType.project]: async () => {
    throw new Error('Method not implemented.');
  },
};

export const createTestObjectGenerator = () => new TestObjectGenerator(testSchemas(), testObjectGenerators);

export const createSpaceObjectGenerator = (space: Space) =>
  new SpaceObjectGenerator(space, testSchemas(), testObjectGenerators, testObjectMutators);
