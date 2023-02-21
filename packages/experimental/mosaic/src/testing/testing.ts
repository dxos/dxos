//
// Copyright 2023 DXOS.org
//

import faker from 'faker';

import { MosaicItem, Vec2 } from '../props';

export const createItem = (position?: Vec2): MosaicItem => ({
  id: faker.datatype.uuid(),
  label: faker.lorem.words(3),
  content: faker.lorem.sentences(faker.datatype.number(3)),
  position
});
