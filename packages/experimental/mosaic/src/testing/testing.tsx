//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

import { type Item, type Location } from '../layout';

export type TestData = {
  title: string;
  description: string;
};

export const createItem = (location?: Location): Item<TestData> => ({
  id: faker.string.uuid(),
  data: {
    title: faker.lorem.words(3),
    description: faker.lorem.sentences(faker.number.int(8)),
  },
  location,
});

export const SeedDecorator = (seed = 0) => {
  return (Story: any) => {
    faker.seed(seed);
    return <Story />;
  };
};
