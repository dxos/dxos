//
// Copyright 2023 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Ref, Type } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { random } from '@dxos/random';

import { SpaceObjectGenerator, TestObjectGenerator } from './generator';
import { type TestGeneratorMap, type TestMutationsMap, type TestSchemaMap } from './types';
import { randomText } from './util';

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/aurora/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

// TODO(burdon): Handle restricted values.
export const Status = ['pending', 'active', 'done'];
export const Priority = [1, 2, 3, 4, 5];

/**
 * @deprecated
 */
export enum TestSchemaType {
  document = 'com.example.type.document',
  organization = 'com.example.type.organization',
  contact = 'com.example.type.person',
  project = 'com.example.type.project',
}

/**
 * @deprecated
 */
const testSchemas = (): TestSchemaMap<TestSchemaType> => {
  const document = Schema.Struct({
    title: Schema.String.annotations({ description: 'title of the document' }),
    content: Schema.String,
  }).pipe(Type.object({ typename: TestSchemaType.document, version: '0.1.0' }));

  const organization = Schema.Struct({
    name: Schema.String.annotations({ description: 'name of the company or organization' }),
    website: Schema.optional(Schema.String.annotations({ description: 'public website URL' })),
    description: Schema.String.annotations({ description: 'short summary of the company' }),
  }).pipe(Type.object({ typename: TestSchemaType.organization, version: '0.1.0' }));

  const contact = Schema.Struct({
    name: Schema.String.annotations({ description: 'name of the person' }),
    email: Schema.optional(Schema.String),
    org: Schema.optional(Ref.Ref(organization)),
    lat: Schema.optional(Schema.Number),
    lng: Schema.optional(Schema.Number),
  }).pipe(Type.object({ typename: TestSchemaType.contact, version: '0.1.0' }));

  const project = Schema.Struct({
    name: Schema.String.annotations({ description: 'name of the project' }),
    description: Schema.String,
    website: Schema.String,
    repo: Schema.String,
    status: Schema.String,
    priority: Schema.Number,
    active: Schema.Boolean,
    org: Schema.optional(Ref.Ref(organization)),
  }).pipe(Type.object({ typename: TestSchemaType.project, version: '0.1.0' }));

  return {
    [TestSchemaType.document]: document,
    [TestSchemaType.organization]: organization,
    [TestSchemaType.contact]: contact,
    [TestSchemaType.project]: project,
  };
};

const testObjectGenerators: TestGeneratorMap<TestSchemaType> = {
  [TestSchemaType.document]: async () => ({
    title: random.lorem.sentence(3),
    content: random.lorem.sentences({ min: 1, max: random.number.int({ min: 1, max: 3 }) }),
  }),

  [TestSchemaType.organization]: async () => ({
    name: random.company.name(),
    website: random.datatype.boolean({ probability: 0.3 }) ? random.internet.url() : undefined,
    description: random.lorem.sentences(),
  }),

  [TestSchemaType.contact]: async (provider) => {
    const organizations = await provider?.(TestSchemaType.organization);
    const location = random.datatype.boolean() ? random.geo.airport() : {};

    return {
      name: random.person.fullName(),
      email: random.datatype.boolean({ probability: 0.5 }) ? random.internet.email() : undefined,
      org:
        organizations?.length && random.datatype.boolean({ probability: 0.8 })
          ? Ref.make(random.helpers.arrayElement(organizations))
          : undefined,
      ...location,
    };
  },

  [TestSchemaType.project]: async () => ({
    name: random.commerce.productName(),
    repo: random.internet.url(),
    status: random.helpers.arrayElement(Status),
    description: random.lorem.sentences(),
    website: random.internet.url(),
    priority: random.helpers.arrayElement(Priority),
    active: random.datatype.boolean(),
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

/**
 * @deprecated Use generators in schema package.
 */
export const createTestObjectGenerator = () => new TestObjectGenerator(testSchemas(), testObjectGenerators);

/**
 * @deprecated Use generators in schema package.
 */
export const createSpaceObjectGenerator = (space: Space) =>
  new SpaceObjectGenerator(space, testSchemas(), testObjectGenerators, testObjectMutators);
