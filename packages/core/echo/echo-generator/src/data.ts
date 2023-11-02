//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/aurora/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

import { faker } from '@faker-js/faker';

import { Schema, type Space, TextObject } from '@dxos/client/echo';

import { SpaceObjectGenerator, TestObjectGenerator } from './generator';
import { type TestGeneratorMap, type TestSchemaMap } from './types';

// TODO(burdon): Handle restricted values.
export const Status = ['pending', 'active', 'done'];
export const Priority = [1, 2, 3, 4, 5];

export type TestSchemaType = 'document' | 'organization' | 'person' | 'project';

export const testSchemas = (): TestSchemaMap<TestSchemaType> => {
  const document = new Schema({
    props: [
      {
        id: 'name',
        type: Schema.PropType.STRING,
      },
      {
        id: 'content',
        type: Schema.PropType.STRING, // TODO(burdon): Rich text.
      },
    ],
  });

  const organization = new Schema({
    typename: 'dxos.org/schema/organization',
    props: [
      // TODO(burdon): Add metadata for default label.
      {
        id: 'name',
        type: Schema.PropType.STRING,
      },
      {
        id: 'website',
        type: Schema.PropType.STRING,
      },
      {
        id: 'active',
        type: Schema.PropType.BOOLEAN,
      },
    ],
  });

  const person = new Schema({
    typename: 'dxos.org/schema/person',
    props: [
      {
        id: 'name',
        type: Schema.PropType.STRING,
      },
      {
        id: 'email',
        type: Schema.PropType.STRING,
      },
      {
        id: 'org',
        type: Schema.PropType.REF,
        ref: organization,
      },
      // TODO(burdon): Convert to object.
      {
        id: 'lat',
        type: Schema.PropType.NUMBER,
      },
      {
        id: 'lng',
        type: Schema.PropType.NUMBER,
      },
    ],
  });

  const project = new Schema({
    typename: 'dxos.org/schema/project',
    props: [
      {
        id: 'title',
        type: Schema.PropType.STRING,
      },
      {
        id: 'repo',
        type: Schema.PropType.STRING,
      },
      {
        id: 'status',
        type: Schema.PropType.STRING,
      },
      {
        id: 'priority',
        type: Schema.PropType.NUMBER,
      },
    ],
  });

  return { document, organization, person, project };
};

export const testObjectGenerators: TestGeneratorMap<TestSchemaType> = {
  document: () => ({
    title: faker.lorem.sentence(3),
    content: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
  }),

  organization: () => ({
    name: faker.company.name(),
    website: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
    description: new TextObject(faker.lorem.sentences()),
  }),

  person: (provider) => {
    const organizations = provider?.('organization');
    return {
      name: faker.person.fullName(),
      email: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.email() : undefined,
      org:
        organizations?.length && faker.datatype.boolean({ probability: 0.3 })
          ? faker.helpers.arrayElement(organizations)
          : undefined,
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    };
  },

  project: () => ({
    title: faker.commerce.productName(),
    repo: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
    status: faker.helpers.arrayElement(Status),
    priority: faker.helpers.arrayElement(Priority),
  }),
};

export const createTestObjectGenerator = () => new TestObjectGenerator(testSchemas(), testObjectGenerators);

export const createSpaceObjectGenerator = (space: Space) =>
  new SpaceObjectGenerator(space, testSchemas(), testObjectGenerators);
