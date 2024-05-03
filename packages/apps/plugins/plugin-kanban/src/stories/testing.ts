//
// Copyright 2023 DXOS.org
//

import { KanbanColumnType, KanbanItemType, KanbanType, TextV0Type } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

// TODO(burdon): Types.
export const createKanban = () => {
  return create(KanbanType, {
    title: faker.lorem.words(3),
    columns: faker.helpers.multiple(
      () =>
        create(KanbanColumnType, {
          title: faker.lorem.words(3),
          items: faker.helpers.multiple(
            () =>
              create(KanbanItemType, {
                title: create(TextV0Type, {
                  content: faker.lorem.words(faker.number.int({ min: 3, max: 24 })) + '.',
                }),
              }),
            { count: faker.number.int(8) },
          ),
        }),
      { count: { min: 2, max: 8 } },
    ),
  });
};
