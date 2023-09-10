//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

type CardType = 'document' | 'message' | 'contact' | 'image' | 'event' | 'project' | 'task' | 'result' | 'table';

const images = [
  'https://images.unsplash.com/photo-1616394158624-a2ba9cfe2994',
  'https://images.unsplash.com/photo-1507941097613-9f2157b69235',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad',
];

type Object = { id: string; type: string };

export const generators: Record<CardType, () => Object> = {
  document: () => ({
    type: 'document',
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    body: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
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
  image: () => ({
    type: 'image',
    id: faker.string.uuid(),
    src: faker.helpers.arrayElement(images),
    boyd: faker.lorem.sentence(),
  }),
  event: (): Object => ({
    type: 'event',
    id: faker.string.uuid(),
  }),
  result: (): Object => ({
    type: 'result',
    id: faker.string.uuid(),
  }),
  project: (): Object => ({
    type: 'project',
    id: faker.string.uuid(),
  }),
  table: (): Object => ({
    type: 'table',
    id: faker.string.uuid(),
  }),
  task: (): Object => ({
    type: 'task',
    id: faker.string.uuid(),
  }),
};
