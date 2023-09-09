//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

import '@dxosTheme';

faker.seed(1234);

export const createCard = () => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  sections: [
    {
      text: faker.lorem.sentences(),
    },
    {
      text: faker.lorem.sentences(),
    },
  ],
});
