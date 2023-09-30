//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

// TODO(burdon): Standardize with aurora/testing.

export type TestItem = { id: string; type: string } & Record<string, any>;

export const createItem = (types?: string[]) => {
  const generator = (types && testItemFactory[faker.helpers.arrayElement(types)]) ?? testItemFactory.document;
  return generator();
};

export const testItemFactory: Record<string, () => TestItem> = {
  document: () => ({
    type: 'document',
    id: faker.string.uuid(),
    title: faker.lorem.sentence(3),
    body: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
  }),

  image: () => ({
    type: 'image',
    id: faker.string.uuid(),
    // title: faker.datatype.boolean() ? faker.lorem.sentence(3) : undefined,
    image: faker.helpers.arrayElement(testImages),
    body: faker.datatype.boolean() ? faker.lorem.sentences() : undefined,
  }),

  // TODO(burdon): Timestamp.
  message: () => ({
    type: 'message',
    id: faker.string.uuid(),
    from: faker.internet.userName(),
    body: faker.lorem.sentence(),
  }),

  // TODO(burdon): Avatar.
  contact: () => ({
    type: 'contact',
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
  }),

  event: () => ({
    type: 'event',
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    date: faker.date.recent(),
  }),

  project: () => ({
    type: 'project',
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    body: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
    tasks: Array.from({ length: faker.number.int(5) }).map(() => testItemFactory.task()),
  }),

  task: () => ({
    type: 'task',
    id: faker.string.uuid(),
    done: faker.datatype.boolean(),
    title: faker.lorem.sentence(),
  }),

  // TODO(burdon): Search result.
  result: () => ({
    type: 'result',
    id: faker.string.uuid(),
  }),

  // TODO(burdon): Generic data.
  table: () => ({
    type: 'table',
    id: faker.string.uuid(),
  }),
};

// https://unsplash.com
// TODO(burdon): Use https://picsum.photos/
export const testImages = [
  // 'https://images.unsplash.com/photo-1554629947-334ff61d85dc',
  'https://images.unsplash.com/photo-1616394158624-a2ba9cfe2994',
  'https://images.unsplash.com/photo-1507941097613-9f2157b69235',
  'https://images.unsplash.com/photo-1431274172761-fca41d930114',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad',
  'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729',
  'https://images.unsplash.com/photo-1605425183435-25b7e99104a4',
];
