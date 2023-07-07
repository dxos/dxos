//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

import { PublicKey } from '@dxos/keys';
import { createStore } from '@dxos/observable-object';

// TODO(burdon): Types.
export const createKanban = () => {
  return createStore({
    id: 'test',
    title: faker.lorem.words(3),
    columns: createStore(
      faker.datatype.array(faker.datatype.number({ min: 2, max: 8 })).map(() => ({
        id: PublicKey.random().toHex(),
        title: faker.lorem.words(3),
        items: createStore(
          faker.datatype.array(faker.datatype.number(8)).map(() => ({
            id: PublicKey.random().toHex(),
            title: faker.lorem.words(faker.datatype.number({ min: 3, max: 8 })) + '.',
          })),
        ),
      })),
    ),
  });
};
