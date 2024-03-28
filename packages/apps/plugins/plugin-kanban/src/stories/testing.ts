//
// Copyright 2023 DXOS.org
//

import { KanbanColumnType, KanbanItemType, KanbanType, TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { faker } from '@dxos/random';

// TODO(burdon): Types.
export const createKanban = () => {
  return E.object(KanbanType, {
    title: faker.lorem.words(3),
    columns: faker.helpers.multiple(
      () =>
        E.object(KanbanColumnType, {
          title: faker.lorem.words(3),
          items: faker.helpers.multiple(
            () =>
              E.object(KanbanItemType, {
                title: E.object(TextV0Type, {
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
