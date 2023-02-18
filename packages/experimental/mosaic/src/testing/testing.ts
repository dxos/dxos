//
// Copyright 2023 DXOS.org
//

import faker from 'faker';

import { Item, Location } from '../layout';

export const createItem = (location?: Location): Item => ({
  id: faker.datatype.uuid(),
  label: faker.lorem.words(3),
  content: faker.lorem.sentences(faker.datatype.number(3)),
  location
});
