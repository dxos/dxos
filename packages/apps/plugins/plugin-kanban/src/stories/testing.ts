//
// Copyright 2023 DXOS.org
//

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

import { KanbanColumnType, KanbanItemType, KanbanType } from '../types';

// TODO(burdon): Types.
export const createKanban = () => {
  return create(KanbanType, {
    name: faker.lorem.words(3),
    columns: faker.helpers.multiple(
      () =>
        create(KanbanColumnType, {
          name: faker.lorem.words(3),
          items: faker.helpers.multiple(
            () =>
              create(KanbanItemType, {
                name: faker.lorem.words(faker.number.int({ min: 3, max: 24 })) + '.',
              }),
            { count: faker.number.int(8) },
          ),
        }),
      { count: { min: 2, max: 8 } },
    ),
  });
};
