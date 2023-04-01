//
// Copyright 2023 DXOS.org
//

import faker from 'faker';

import { Item, Location } from '../layout';

export type TestData = {
  title: string;
  description: string;
};

export const createItem = (location?: Location): Item<TestData> => ({
  id: faker.datatype.uuid(),
  data: {
    title: faker.lorem.words(3),
    description: faker.lorem.sentences(faker.datatype.number(8))
  },
  location
});
