//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { Item, Location } from '../layout';

export type TestData = {
  title: string;
  description: string;
};

export const createItem = (location?: Location): Item<TestData> => ({
  id: faker.datatype.uuid(),
  data: {
    title: faker.lorem.words(3),
    description: faker.lorem.sentences(faker.datatype.number(8)),
  },
  location,
});

export const SeedDecorator = (seed = 0) => {
  return (Story: any) => {
    faker.seed(seed);
    return <Story />;
  };
};
