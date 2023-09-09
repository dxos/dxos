//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

export const createCard = () => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  sections: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }).map(() => ({
    text: faker.lorem.sentence(),
  })),
});
